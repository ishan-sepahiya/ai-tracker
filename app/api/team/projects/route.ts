import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
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
 * Find the organization that owns a department.
 *
 * This lets us authorize project operations through the
 * complete hierarchy:
 *
 * Project → Department → Organization → User
 */
async function getDepartmentOrganizationId(
  departmentId: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("departments")
    .select("organization_id")
    .eq("id", departmentId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to find department: ${error.message}`,
    );
  }

  return data?.organization_id ?? null;
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
 * GET
 *
 * Query:
 * /api/team/projects?departmentId=<id>
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

    const departmentId =
      searchParams.get("departmentId")?.trim() || "";

    if (!departmentId) {
      return Response.json(
        {
          error: "Department ID is required.",
        },
        { status: 400 },
      );
    }

    const organizationId =
      await getDepartmentOrganizationId(
        departmentId,
      );

    if (!organizationId) {
      return Response.json(
        {
          error: "Department not found.",
        },
        { status: 404 },
      );
    }

    await requireOrganizationAccess(
      organizationId,
    );

    const { data, error } = await supabaseAdmin
      .from("projects")
      .select(
        `
          id,
          department_id,
          name,
          created_at,
          updated_at
        `,
      )
      .eq("department_id", departmentId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(
        "❌ Failed to load projects:",
        error,
      );

      return Response.json(
        {
          error: "Failed to load projects.",
        },
        { status: 500 },
      );
    }

    return Response.json({
      projects: data ?? [],
    });
  } catch (error) {
    console.error(
      "❌ GET /api/team/projects failed:",
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
 *   departmentId: string;
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

    const departmentId =
      typeof body.departmentId === "string"
        ? body.departmentId.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!departmentId) {
      return Response.json(
        {
          error: "Department ID is required.",
        },
        { status: 400 },
      );
    }

    if (!name) {
      return Response.json(
        {
          error: "Project name is required.",
        },
        { status: 400 },
      );
    }

    const organizationId =
      await getDepartmentOrganizationId(
        departmentId,
      );

    if (!organizationId) {
      return Response.json(
        {
          error: "Department not found.",
        },
        { status: 404 },
      );
    }

    await requireOrganizationAccess(
      organizationId,
    );

    const projectId = crypto.randomUUID();

    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("projects")
      .insert({
        id: projectId,
        department_id: departmentId,
        name,
        created_at: now,
        updated_at: now,
      })
      .select(
        `
          id,
          department_id,
          name,
          created_at,
          updated_at
        `,
      )
      .single();

    if (error) {
      console.error(
        "❌ Failed to create project:",
        error,
      );

      return Response.json(
        {
          error: `Failed to create project: ${error.message}`,
        },
        { status: 500 },
      );
    }

    return Response.json(
      {
        project: data,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "❌ POST /api/team/projects failed:",
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

    const projectId =
      typeof body.id === "string"
        ? body.id.trim()
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
          error: "Project name is required.",
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
      .from("projects")
      .update({
        name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .select(
        `
          id,
          department_id,
          name,
          created_at,
          updated_at
        `,
      )
      .single();

    if (error) {
      console.error(
        "❌ Failed to update project:",
        error,
      );

      return Response.json(
        {
          error: `Failed to update project: ${error.message}`,
        },
        { status: 500 },
      );
    }

    return Response.json({
      project: data,
    });
  } catch (error) {
    console.error(
      "❌ PATCH /api/team/projects failed:",
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

    const projectId =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

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
      .from("projects")
      .delete()
      .eq("id", projectId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error(
        "❌ Failed to delete project:",
        error,
      );

      return Response.json(
        {
          error: `Failed to delete project: ${error.message}`,
        },
        { status: 500 },
      );
    }

    if (!data) {
      return Response.json(
        {
          error: "Project could not be deleted.",
        },
        { status: 404 },
      );
    }

    return Response.json({
      success: true,
      projectId: data.id,
    });
  } catch (error) {
    console.error(
      "❌ DELETE /api/team/projects failed:",
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