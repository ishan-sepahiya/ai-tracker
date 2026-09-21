import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrganizationAccess } from "@/lib/api-management/authorization";

async function getCredentialContext(credentialId: string) {
  const { data, error } = await supabaseAdmin
    .from("provider_credentials")
    .select(
      `
        id,
        project_id,
        environment_id,
        projects (
          id,
          department_id,
          departments (
            id,
            organization_id
          )
        )
      `,
    )
    .eq("id", credentialId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Provider credential not found.");
  }

  const project = Array.isArray(data.projects)
    ? data.projects[0]
    : data.projects;

  if (!project) {
    throw new Error("Project not found.");
  }

  const department = Array.isArray(project.departments)
    ? project.departments[0]
    : project.departments;

  if (!department) {
    throw new Error("Department not found.");
  }

  return {
    credentialId: data.id,
    projectId: project.id,
    environmentId: data.environment_id,
    organizationId: department.organization_id,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Provider credential id is required." },
        { status: 400 },
      );
    }

    const context = await getCredentialContext(id);

    await requireOrganizationAccess(context.organizationId);

    const { data, error } = await supabaseAdmin
      .from("provider_credentials")
      .select(
        `
          id,
          project_id,
          environment_id,
          provider_name,
          display_name,
          status,
          created_by,
          rotated_at,
          created_at,
          updated_at
        `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json(
        { error: "Provider credential not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      providerCredential: data,
    });
  } catch (error) {
    console.error(
      "GET /api/team/provider-ceredentials/[id] failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch provider credential.";

    const status =
      message === "Unauthorized"
        ? 401
        : message.includes("Forbidden")
          ? 403
          : message.includes("not found")
            ? 404
            : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Provider credential id is required." },
        { status: 400 },
      );
    }

    const body = await request.json();

    const displayName =
      typeof body.displayName === "string"
        ? body.displayName.trim()
        : undefined;

    const secret =
      typeof body.secret === "string"
        ? body.secret.trim()
        : undefined;

    if (displayName === undefined && secret === undefined) {
      return NextResponse.json(
        {
          error:
            "At least one of displayName or secret is required.",
        },
        { status: 400 },
      );
    }

    if (displayName !== undefined && !displayName) {
      return NextResponse.json(
        { error: "displayName cannot be empty." },
        { status: 400 },
      );
    }

    if (secret !== undefined && !secret) {
      return NextResponse.json(
        { error: "secret cannot be empty." },
        { status: 400 },
      );
    }

    const context = await getCredentialContext(id);

    await requireOrganizationAccess(context.organizationId);

    const updateData: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };

    if (displayName !== undefined) {
      updateData.display_name = displayName;
    }

    if (secret !== undefined) {
      updateData.secret_ref = secret;
      updateData.rotated_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("provider_credentials")
      .update(updateData)
      .eq("id", id)
      .select(
        `
          id,
          project_id,
          environment_id,
          provider_name,
          display_name,
          status,
          created_by,
          rotated_at,
          created_at,
          updated_at
        `,
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      providerCredential: data,
    });
  } catch (error) {
    console.error(
      "PATCH /api/team/provider-ceredentials/[id] failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update provider credential.";

    const status =
      message === "Unauthorized"
        ? 401
        : message.includes("Forbidden")
          ? 403
          : message.includes("not found")
            ? 404
            : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Provider credential id is required." },
        { status: 400 },
      );
    }

    const context = await getCredentialContext(id);

    await requireOrganizationAccess(context.organizationId);

    const { data, error } = await supabaseAdmin
      .from("provider_credentials")
      .update({
        status: "revoked",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
          id,
          project_id,
          environment_id,
          provider_name,
          display_name,
          status,
          created_by,
          rotated_at,
          created_at,
          updated_at
        `,
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      providerCredential: data,
    });
  } catch (error) {
    console.error(
      "DELETE /api/team/provider-ceredentials/[id] failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to revoke provider credential.";

    const status =
      message === "Unauthorized"
        ? 401
        : message.includes("Forbidden")
          ? 403
          : message.includes("not found")
            ? 404
            : 500;

    return NextResponse.json({ error: message }, { status });
  }
}