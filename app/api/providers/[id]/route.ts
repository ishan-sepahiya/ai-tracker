import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  disableProvider,
  setProviderActive,
  type ProviderListItem,
} from "@/lib/providers/repository";

async function getAuthedUserId() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const cookieStorePromise = cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: async () =>
        (await cookieStorePromise).getAll().map((c) => ({
          name: c.name,
          value: c.value,
        })),
      setAll: async () => {},
    },
  });

  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providerId = (await context.params).id;
  const body = (await request.json()) as { is_active?: boolean };

  if (typeof body.is_active !== "boolean") {
    return NextResponse.json(
      { error: "`is_active` boolean is required" },
      { status: 400 }
    );
  }

  const updated: ProviderListItem = await setProviderActive({
    userId,
    providerId,
    isActive: body.is_active,
  });

  return NextResponse.json({ provider: updated }, { status: 200 });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providerId = (await context.params).id;

  const updated: ProviderListItem = await disableProvider({
    userId,
    providerId,
  });

  return NextResponse.json({ provider: updated, ok: true }, { status: 200 });
}

