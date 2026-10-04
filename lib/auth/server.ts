"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function requireUser() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Cookie writes are handled by the existing auth flow.
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
  };
}

/**
 * Ensure that a profile row exists for the authenticated user.
 *
 * Important:
 * - Uses user ID as the conflict target.
 * - Does not overwrite an existing full_name with null.
 * - Handles a duplicate email gracefully.
 */
export async function ensureProfileRow(
  userId: string,
  email: string | null,
  fullName?: string | null,
) {
  const profile = {
    id: userId,
    ...(email ? { email } : {}),
    ...(fullName?.trim()
      ? { full_name: fullName.trim() }
      : {}),
  };

  const { error } = await supabaseAdmin
    .from("profiles")
    .upsert(profile, {
      onConflict: "id",
    });

  /**
   * 23505 = unique_violation
   *
   * If the email already belongs to another profile,
   * retry without the email field so that the existing
   * email value is not overwritten.
   */
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
        {
          onConflict: "id",
        },
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