import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  listProvidersForUser,
  saveProvider,
  type ProviderListItem,
} from "@/lib/providers/repository";

async function getAuthedUserId() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseAnonKey
  ) {
    throw new Error(
      "Missing Supabase environment variables."
    );
  }

  const cookieStore =
    await cookies();

  const supabase =
    createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },

          setAll() {
            // Cookie writes are handled
            // by the existing auth flow.
          },
        },
      }
    );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error(
      "Supabase authentication error:",
      error
    );

    return null;
  }

  return user?.id ?? null;
}

// ============================================================
// GET
// ============================================================

export async function GET() {
  try {
    const userId =
      await getAuthedUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const providers =
      await listProvidersForUser(
        userId
      );

    return NextResponse.json(
      {
        providers,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "❌ GET /api/providers failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load providers.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// POST
// ============================================================

export async function POST(
  request: Request
) {
  try {
    const userId =
      await getAuthedUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request.json()) as {
        provider_name?: string;
        display_name?: string;
        displayName?: string;
        model_name?: string;
        modelName?: string;
        is_custom?: boolean;
        isCustom?: boolean;
      };

    const providerName =
      typeof body.provider_name ===
      "string"
        ? body.provider_name.trim()
        : "";

    const displayName =
      typeof body.display_name ===
      "string"
        ? body.display_name.trim()
        : typeof body.displayName ===
            "string"
          ? body.displayName.trim()
          : "";

    const modelName =
      typeof body.model_name ===
      "string"
        ? body.model_name.trim()
        : typeof body.modelName ===
            "string"
          ? body.modelName.trim()
          : "";

    const isCustom =
      typeof body.is_custom ===
      "boolean"
        ? body.is_custom
        : typeof body.isCustom ===
            "boolean"
          ? body.isCustom
          : false;

    if (!providerName) {
      return NextResponse.json(
        {
          error:
            "provider_name is required.",
        },
        {
          status: 400,
        }
      );
    }

    const row =
      await saveProvider({
        userId,
        providerName,
        displayName:
          displayName || null,
        modelName:
          modelName || null,
        isCustom,
        isActive: true,
      });

    const responseItem: ProviderListItem =
      {
        id: row.id,
        user_id: row.user_id,
        provider_name:
          row.provider_name,
        display_name:
          row.display_name,
        model_name:
          row.model_name ?? null,
        is_custom:
          row.is_custom ?? null,
        is_active:
          row.is_active,
      };

    return NextResponse.json(
      {
        provider:
          responseItem,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "❌ POST /api/providers failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to save provider.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}