import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { decryptApiKey } from "@/lib/crypto";
import {
  listProvidersForUser,
  saveProvider,
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
      // No cookie writes in REST routes (middleware handles refreshing).
      setAll: async () => {},
    },
  });

  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function maskLast4FromEncrypted(apiKeyEncrypted: string): string | null {
  try {
    const decrypted = decryptApiKey(apiKeyEncrypted).trim();
    if (!decrypted) return null;
    return decrypted.slice(-4);
  } catch {
    return null;
  }
}

export async function GET() {
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providers = await listProvidersForUser(userId);
  return NextResponse.json({ providers });
}

export async function POST(request: Request) {
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    provider_name?: string;
    display_name?: string;
    displayName?: string;
    apiKey?: string;
  };

  const providerName = body.provider_name;
  const displayName = body.display_name ?? body.displayName ?? null;
  const apiKey = body.apiKey;

  if (!providerName || !apiKey || typeof apiKey !== "string") {
    return NextResponse.json(
      { error: "provider_name and apiKey are required" },
      { status: 400 }
    );
  }

  const row = await saveProvider({
    userId,
    providerName,
    displayName,
    apiKey,
    isActive: true,
  });

  const responseItem: ProviderListItem = {
    id: row.id,
    user_id: row.user_id,
    provider_name: row.provider_name,
    display_name: row.display_name,
    is_active: row.is_active,
    api_key_masked_last4: maskLast4FromEncrypted(row.api_key_encrypted),
  };

  return NextResponse.json({ provider: responseItem }, { status: 201 });
}

