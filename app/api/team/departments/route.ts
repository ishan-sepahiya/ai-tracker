import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrganizationAccess } from "@/lib/api-management/authorization";

type DepartmentBody = {
  id?: string;
  organizationId?: string;
  name?: string;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

/**
 * GET
 *
 * Get departments for an organization.
 *
 * Query:
 * /api/team/departments?organizationId=...
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const organizationId =
      searchParams.get("organizationId")?.trim() ?? "";

    if (!organizationId) {
      return Response.json(
        {
          error: "Organization ID is required.",
        },
        { status: 400 },
      );
    }

    await requireOrganizationAccess(organizationId);

    const { data, error } = await supabaseAdmin
      .from("departments")
      .select(
        `
          id,
          organization_id,
          name,
          created_at,
          updated_at
        `,
      )
      .eq("organization_id", organizationId)
      .order("name", { ascending: true });

    if (error) {
      console.error(
        "❌ Failed to load departments:",
        error,
      );

      return Response.json(
        {
          error: `Failed to load departments: ${error.message}`,
        },
        { status: 500 },
      );
    }

    return Response.json({
      departments: data ?? [],
    });
  } catch (error) {
    console.error(
      "❌ GET /api/team/departments failed:",
      error,
    );

    const message = errorMessage(error);

    if (
      message.toLowerCase().includes("unauthorized")
    ) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (
      message.toLowerCase().includes("forbidden") ||
      message.toLowerCase().includes("do not have access")
    ) {
      return Response.json(
        { error: message },
        { status: 403 },
      );
    }

    return Response.json(
      {
        error: message || "Internal server error.",
      },
      { status: 500 },
    );
  }
}

/**
 * POST
 *
 * Create a department.
 *
 * Body:
 * {
 *   organizationId: string;
 *   name: string;
 * }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DepartmentBody;

    const organizationId =
      typeof body.organizationId === "string"
        ? body.organizationId.trim()
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
          error: "Department name is required.",
        },
        { status: 400 },
      );
    }

    if (name.length > 100) {
      return Response.json(
        {
          error: "Department name must be 100 characters or less.",
        },
        { status: 400 },
      );
    }

    // Make sure the current user can manage this organization.
    const access =
      await requireOrganizationAccess(organizationId);

    const departmentId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("departments")
      .insert({
        id: departmentId,
        organization_id: organizationId,
        name,
        created_at: now,
        updated_at: now,
      })
      .select(
        `
          id,
          organization_id,
          name,
          created_at,
          updated_at
        `,
      )
      .single();

    if (error) {
      console.error(
        "❌ Failed to create department:",
        error,
      );

      return Response.json(
        {
          error: `Failed to create department: ${error.message}`,
        },
        { status: 500 },
      );
    }

    console.log(
      `✓ Department created by ${access.userId}: ${data.id}`,
    );

    return Response.json(
      {
        department: data,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "❌ POST /api/team/departments failed:",
      error,
    );

    const message = errorMessage(error);

    if (
      message.toLowerCase().includes("unauthorized")
    ) {
      return Response.json(
        {
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    if (
      message.toLowerCase().includes("forbidden") ||
      message.toLowerCase().includes("do not have access")
    ) {
      return Response.json(
        {
          error: message,
        },
        { status: 403 },
      );
    }

    return Response.json(
      {
        error: message || "Internal server error.",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH
 *
 * Rename a department.
 *
 * Body:
 * {
 *   id: string;
 *   name: string;
 * }
 */
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as DepartmentBody;

    const departmentId =
      typeof body.id === "string"
        ? body.id.trim()
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
          error: "Department name is required.",
        },
        { status: 400 },
      );
    }

    const { data: department, error: findError } =
      await supabaseAdmin
        .from("departments")
        .select("id, organization_id")
        .eq("id", departmentId)
        .maybeSingle();

    if (findError) {
      return Response.json(
        {
          error: `Failed to find department: ${findError.message}`,
        },
        { status: 500 },
      );
    }

    if (!department) {
      return Response.json(
        {
          error: "Department not found.",
        },
        { status: 404 },
      );
    }

    await requireOrganizationAccess(
      department.organization_id,
    );

    const { data, error } = await supabaseAdmin
      .from("departments")
      .update({
        name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", departmentId)
      .select(
        `
          id,
          organization_id,
          name,
          created_at,
          updated_at
        `,
      )
      .single();

    if (error) {
      console.error(
        "❌ Failed to update department:",
        error,
      );

      return Response.json(
        {
          error: `Failed to update department: ${error.message}`,
        },
        { status: 500 },
      );
    }

    return Response.json({
      department: data,
    });
  } catch (error) {
    console.error(
      "❌ PATCH /api/team/departments failed:",
      error,
    );

    const message = errorMessage(error);

    if (
      message.toLowerCase().includes("unauthorized")
    ) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (
      message.toLowerCase().includes("forbidden") ||
      message.toLowerCase().includes("do not have access")
    ) {
      return Response.json(
        { error: message },
        { status: 403 },
      );
    }

    return Response.json(
      {
        error: message || "Internal server error.",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE
 *
 * Delete a department.
 *
 * Body:
 * {
 *   id: string;
 * }
 */
export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as DepartmentBody;

    const departmentId =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!departmentId) {
      return Response.json(
        {
          error: "Department ID is required.",
        },
        { status: 400 },
      );
    }

    const { data: department, error: findError } =
      await supabaseAdmin
        .from("departments")
        .select("id, organization_id")
        .eq("id", departmentId)
        .maybeSingle();

    if (findError) {
      return Response.json(
        {
          error: `Failed to find department: ${findError.message}`,
        },
        { status: 500 },
      );
    }

    if (!department) {
      return Response.json(
        {
          error: "Department not found.",
        },
        { status: 404 },
      );
    }

    await requireOrganizationAccess(
      department.organization_id,
    );

    const { data, error } = await supabaseAdmin
      .from("departments")
      .delete()
      .eq("id", departmentId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error(
        "❌ Failed to delete department:",
        error,
      );

      return Response.json(
        {
          error: `Failed to delete department: ${error.message}`,
        },
        { status: 500 },
      );
    }

    if (!data) {
      return Response.json(
        {
          error: "Department not found.",
        },
        { status: 404 },
      );
    }

    return Response.json({
      success: true,
      departmentId: data.id,
    });
  } catch (error) {
    console.error(
      "❌ DELETE /api/team/departments failed:",
      error,
    );

    const message = errorMessage(error);

    if (
      message.toLowerCase().includes("unauthorized")
    ) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (
      message.toLowerCase().includes("forbidden") ||
      message.toLowerCase().includes("do not have access")
    ) {
      return Response.json(
        { error: message },
        { status: 403 },
      );
    }

    return Response.json(
      {
        error: message || "Internal server error.",
      },
      { status: 500 },
    );
  }
}