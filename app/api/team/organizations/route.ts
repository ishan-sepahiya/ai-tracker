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
    return null;
  }

  return user;
}

/**
 * GET
 *
 * Return all organizations owned by the authenticated user.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("organizations")
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
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(
        "❌ Failed to load organizations:",
        error,
      );

      return Response.json(
        {
          error: "Failed to load organizations.",
        },
        { status: 500 },
      );
    }

    return Response.json({
      organizations: data ?? [],
    });
  } catch (error) {
    console.error(
      "❌ GET /api/team/organizations failed:",
      error,
    );

    return Response.json(
      {
        error: "Internal server error.",
      },
      { status: 500 },
    );
  }
}

/**
 * POST
 *
 * Create a new organization owned by the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!name) {
      return Response.json(
        {
          error: "Organization name is required.",
        },
        { status: 400 },
      );
    }

    const organizationId = crypto.randomUUID();

    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
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

    if (error) {
      console.error(
        "❌ Failed to create organization:",
        error,
      );

      return Response.json(
        {
          error: `Failed to create organization: ${error.message}`,
        },
        { status: 500 },
      );
    }

    return Response.json(
      {
        organization: data,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "❌ POST /api/team/organizations failed:",
      error,
    );

    return Response.json(
      {
        error: "Internal server error.",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH
 *
 * Rename an organization.
 *
 * Body:
 * {
 *   id: string;
 *   name: string;
 * }
 */
export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();

    const organizationId =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!organizationId) {
      return Response.json(
        {
          error: "Organization ID is required.",
        },
        { status: 400 },
      );
    }

    if (!name) {
      return Response.json(
        {
          error: "Organization name is required.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("organizations")
      .update({
        name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId)
      .eq("owner_user_id", user.id)
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
      .maybeSingle();

    if (error) {
      console.error(
        "❌ Failed to update organization:",
        error,
      );

      return Response.json(
        {
          error: `Failed to update organization: ${error.message}`,
        },
        { status: 500 },
      );
    }

    if (!data) {
      return Response.json(
        {
          error:
            "Organization not found or you do not have access to it.",
        },
        { status: 404 },
      );
    }

    return Response.json({
      organization: data,
    });
  } catch (error) {
    console.error(
      "❌ PATCH /api/team/organizations failed:",
      error,
    );

    return Response.json(
      {
        error: "Internal server error.",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE
 *
 * Delete an organization owned by the authenticated user.
 *
 * Child records should be removed by the database's
 * configured foreign-key cascade rules.
 */
export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();

    const organizationId =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!organizationId) {
      return Response.json(
        {
          error: "Organization ID is required.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("organizations")
      .delete()
      .eq("id", organizationId)
      .eq("owner_user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error(
        "❌ Failed to delete organization:",
        error,
      );

      return Response.json(
        {
          error: `Failed to delete organization: ${error.message}`,
        },
        { status: 500 },
      );
    }

    if (!data) {
      return Response.json(
        {
          error:
            "Organization not found or you do not have access to it.",
        },
        { status: 404 },
      );
    }

    return Response.json({
      success: true,
      organizationId: data.id,
    });
  } catch (error) {
    console.error(
      "❌ DELETE /api/team/organizations failed:",
      error,
    );

    return Response.json(
      {
        error: "Internal server error.",
      },
      { status: 500 },
    );
  }
}