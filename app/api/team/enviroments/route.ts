import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireOrganizationAccess } from "@/lib/api-management/authorization";
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
 * Find the organization that owns a project.
 *
 * Project → Department → Organization
 */
async function getProjectOrganizationId(
  projectId: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(
      `
        department_id,
        departments (
          organization_id
        )
      `,
    )
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to find project: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  const department = Array.isArray(data.departments)
    ? data.departments[0]
    : data.departments;

  return department?.organization_id ?? null;
}

/**
 * Find the organization that owns an environment.
 *
 * Environment → Project → Department → Organization
 */
async function getEnvironmentOrganizationId(
  environmentId: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("environments")
    .select(
      `
        project_id,
        projects (
          department_id,
          departments (
            organization_id
          )
        )
      `,
    )
    .eq("id", environmentId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to find environment: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  const project = Array.isArray(data.projects)
    ? data.projects[0]
    : data.projects;

  const department = project
    ? Array.isArray(project.departments)
      ? project.departments[0]
      : project.departments
    : null;

  return department?.organization_id ?? null;
}

/**
 * GET
 *
 * Query:
 * /api/team/environments?projectId=<id>
 */
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);

    const projectId =
      searchParams.get("projectId")?.trim() || "";

    if (!projectId) {
      return Response.json(
        {
          error: "Project ID is required.",
        },
        { status: 400 },
      );
    }

    const organizationId =
      await getProjectOrganizationId(projectId);

    if (!organizationId) {
      return Response.json(
        {
          error: "Project not found.",
        },
        { status: 404 },
      );
    }

    await requireOrganizationAccess(
      organizationId,
    );

    const { data, error } = await supabaseAdmin
      .from("environments")
      .select(
        `
          id,
          project_id,
          name,
          created_at
        `,
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(
        "❌ Failed to load environments:",
        error,
      );

      return Response.json(
        {
          error: "Failed to load environments.",
        },
        { status: 500 },
      );
    }

    return Response.json({
      environments: data ?? [],
    });
  } catch (error) {
    console.error(
      "❌ GET /api/team/environments failed:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "Unauthorized"
    ) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (
      error instanceof Error &&
      error.message.startsWith("Forbidden:")
    ) {
      return Response.json(
        { error: error.message },
        { status: 403 },
      );
    }

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error.",
      },
      { status: 500 },
    );
  }
}

/**
 * POST
 *
 * Body:
 * {
 *   projectId: string;
 *   name: string;
 * }
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

    const projectId =
      typeof body.projectId === "string"
        ? body.projectId.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!projectId) {
      return Response.json(
        {
          error: "Project ID is required.",
        },
        { status: 400 },
      );
    }

    if (!name) {
      return Response.json(
        {
          error: "Environment name is required.",
        },
        { status: 400 },
      );
    }

    const organizationId =
      await getProjectOrganizationId(projectId);

    if (!organizationId) {
      return Response.json(
        {
          error: "Project not found.",
        },
        { status: 404 },
      );
    }

    await requireOrganizationAccess(
      organizationId,
    );

    const environmentId = crypto.randomUUID();

    const { data, error } = await supabaseAdmin
      .from("environments")
      .insert({
        id: environmentId,
        project_id: projectId,
        name,
        created_at: new Date().toISOString(),
      })
      .select(
        `
          id,
          project_id,
          name,
          created_at
        `,
      )
      .single();

    if (error) {
      console.error(
        "❌ Failed to create environment:",
        error,
      );

      return Response.json(
        {
          error: `Failed to create environment: ${error.message}`,
        },
        { status: 500 },
      );
    }

    return Response.json(
      {
        environment: data,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "❌ POST /api/team/environments failed:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "Unauthorized"
    ) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (
      error instanceof Error &&
      error.message.startsWith("Forbidden:")
    ) {
      return Response.json(
        { error: error.message },
        { status: 403 },
      );
    }

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error.",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH
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

    const environmentId =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!environmentId) {
      return Response.json(
        {
          error: "Environment ID is required.",
        },
        { status: 400 },
      );
    }

    if (!name) {
      return Response.json(
        {
          error: "Environment name is required.",
        },
        { status: 400 },
      );
    }

    const organizationId =
      await getEnvironmentOrganizationId(
        environmentId,
      );

    if (!organizationId) {
      return Response.json(
        {
          error: "Environment not found.",
        },
        { status: 404 },
      );
    }

    await requireOrganizationAccess(
      organizationId,
    );

    const { data, error } = await supabaseAdmin
      .from("environments")
      .update({
        name,
      })
      .eq("id", environmentId)
      .select(
        `
          id,
          project_id,
          name,
          created_at
        `,
      )
      .single();

    if (error) {
      console.error(
        "❌ Failed to update environment:",
        error,
      );

      return Response.json(
        {
          error: `Failed to update environment: ${error.message}`,
        },
        { status: 500 },
      );
    }

    return Response.json({
      environment: data,
    });
  } catch (error) {
    console.error(
      "❌ PATCH /api/team/environments failed:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "Unauthorized"
    ) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (
      error instanceof Error &&
      error.message.startsWith("Forbidden:")
    ) {
      return Response.json(
        { error: error.message },
        { status: 403 },
      );
    }

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error.",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE
 *
 * Body:
 * {
 *   id: string;
 * }
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

    const environmentId =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!environmentId) {
      return Response.json(
        {
          error: "Environment ID is required.",
        },
        { status: 400 },
      );
    }

    const organizationId =
      await getEnvironmentOrganizationId(
        environmentId,
      );

    if (!organizationId) {
      return Response.json(
        {
          error: "Environment not found.",
        },
        { status: 404 },
      );
    }

    await requireOrganizationAccess(
      organizationId,
    );

    const { data, error } = await supabaseAdmin
      .from("environments")
      .delete()
      .eq("id", environmentId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error(
        "❌ Failed to delete environment:",
        error,
      );

      return Response.json(
        {
          error: `Failed to delete environment: ${error.message}`,
        },
        { status: 500 },
      );
    }

    if (!data) {
      return Response.json(
        {
          error: "Environment could not be deleted.",
        },
        { status: 404 },
      );
    }

    return Response.json({
      success: true,
      environmentId: data.id,
    });
  } catch (error) {
    console.error(
      "❌ DELETE /api/team/environments failed:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "Unauthorized"
    ) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (
      error instanceof Error &&
      error.message.startsWith("Forbidden:")
    ) {
      return Response.json(
        { error: error.message },
        { status: 403 },
      );
    }

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error.",
      },
      { status: 500 },
    );
  }
}