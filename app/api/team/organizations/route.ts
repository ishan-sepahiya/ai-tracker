import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseAdmin } from "@/lib/supabase-admin";

async function getAuthenticatedUser() {
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
          // Auth cookies are managed by the existing auth flow.
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function POST(request: Request) {
  try {
    // ---------------------------------------------------------
    // 1. Authenticate the current user
    // ---------------------------------------------------------
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    // ---------------------------------------------------------
    // 2. Read request body
    // ---------------------------------------------------------
    const body = await request.json();

    const name =
      typeof body?.name === "string"
        ? body.name.trim()
        : "";

    // ---------------------------------------------------------
    // 3. Validate organization name
    // ---------------------------------------------------------
    if (!name) {
      return NextResponse.json(
        {
          error: "Organization name is required.",
        },
        { status: 400 },
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        {
          error:
            "Organization name must be 100 characters or less.",
        },
        { status: 400 },
      );
    }

    // ---------------------------------------------------------
    // 4. Generate organization ID and timestamps
    // ---------------------------------------------------------
    const organizationId = crypto.randomUUID();
    const now = new Date().toISOString();

    // ---------------------------------------------------------
    // 5. Create organization
    //
    // owner_user_id connects the organization to the
    // currently authenticated developer.
    // ---------------------------------------------------------
    const { data: organization, error } = await supabaseAdmin
      .from("organizations")
      .insert({
        id: organizationId,
        name,
        owner_user_id: user.id,
        created_at: now,
        updated_at: now,
      })
      .select(
        `
          id,
          name,
          owner_user_id,
          subscription_id,
          created_at,
          updated_at
        `,
      )
      .single();

    // ---------------------------------------------------------
    // 6. Handle database error
    // ---------------------------------------------------------
    if (error) {
      console.error(
        "❌ Organization creation failed:",
        error,
      );

      return NextResponse.json(
        {
          error: "Failed to create organization.",
          details: error.message,
        },
        { status: 500 },
      );
    }

    // ---------------------------------------------------------
    // 7. Return created organization
    // ---------------------------------------------------------
    return NextResponse.json(
      {
        organization,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "❌ Unexpected organization creation error:",
      error,
    );

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      { status: 500 },
    );
  }
}