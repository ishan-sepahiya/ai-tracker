"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getCookiesStore() {
  const cookieStorePromise = cookies();

  return {
    getAll: async () =>
      (await cookieStorePromise).getAll().map((c) => ({
        name: c.name,
        value: c.value,
      })),
    // In server actions, cookie writes might be restricted depending on the runtime.
    // createServerClient will attempt to persist refreshed tokens; if writes are not
    // available, auth gating may be less reliable but won't crash the app.
    setAll: async (
      cookiesToSet: Array<{
        name: string;
        value: string;
        options?: Record<string, unknown>;
      }>
    ) => {
      const cookieStore = await cookieStorePromise;
      const maybeSet = (cookieStore as { set?: (arg: unknown) => void }).set;
      if (typeof maybeSet !== "function") return;

      cookiesToSet.forEach(({ name, value, options }) => {
        maybeSet({ name, value, ...(options ?? {}) });
      });
    },
  };
}

export async function requireUser() {
  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  // Validate the user's session using Supabase Auth server.
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: getCookiesStore(),
  });

  const { data: userData, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!userData?.user) {
    throw new Error("Unauthorized");
  }

  // Ensure profile row exists (useful if triggers are not configured).
  const userId = userData.user.id;
  const email = userData.user.email ?? null;

  return { userId, email };
}


export async function ensureProfileRow(
  userId: string,
  email: string | null,
  fullName?: string | null,
) {
  const profile = {
    id: userId,
    ...(email ? { email } : {}),
    ...(fullName?.trim() ? { full_name: fullName.trim() } : {}),
  };

  const { error } = await supabaseAdmin
    .from("profiles")
    .upsert(profile, { onConflict: "id" });

  // The email may already belong to another profile.
  // Retry without email rather than overwriting that profile.
  if (error?.code === "23505" && email) {
    const { error: retryError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          ...(fullName?.trim()
            ? { full_name: fullName.trim() }
            : {}),
        },
        { onConflict: "id" },
      );

    if (retryError) {
      throw new Error(
        `Failed to initialize profile: ${retryError.message}`,
      );
    }

    return;
  }

  if (error) {
    throw new Error(
      `Failed to initialize profile: ${error.message}`,
    );
  }
}


