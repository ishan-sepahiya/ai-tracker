import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { requireUser } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrganizationAccess } from "@/lib/api-management/authorization";

async function getProjectContext(
  projectId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(
      `
        id,
        department_id,
        departments (
          id,
          organization_id
        )
      `,
    )
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Project not found");
  }

  const department = Array.isArray(
    data.departments,
  )
    ? data.departments[0]
    : data.departments;

  if (!department) {
    throw new Error("Department not found");
  }

  return {
    projectId: data.id,
    organizationId:
      department.organization_id,
  };
}

async function getEnvironmentContext(
  environmentId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("environments")
    .select(
      `
        id,
        project_id,
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
    .eq("id", environmentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Environment not found");
  }

  const project = Array.isArray(data.projects)
    ? data.projects[0]
    : data.projects;

  if (!project) {
    throw new Error("Project not found");
  }

  const department = Array.isArray(
    project.departments,
  )
    ? project.departments[0]
    : project.departments;

  if (!department) {
    throw new Error("Department not found");
  }

  return {
    environmentId: data.id,
    projectId: project.id,
    organizationId:
      department.organization_id,
  };
}

export async function GET(
  request: NextRequest,
) {
  try {
    await requireUser();

    const projectId =
      request.nextUrl.searchParams.get(
        "projectId",
      );

    const environmentId =
      request.nextUrl.searchParams.get(
        "environmentId",
      );

    if (!projectId && !environmentId) {
      return NextResponse.json(
        {
          error:
            "projectId or environmentId is required.",
        },
        { status: 400 },
      );
    }

    let resolvedProjectId: string;
    let organizationId: string;

    if (environmentId) {
      const context =
        await getEnvironmentContext(
          environmentId,
        );

      resolvedProjectId =
        context.projectId;
      organizationId =
        context.organizationId;
    } else {
      const context =
        await getProjectContext(projectId!);

      resolvedProjectId =
        context.projectId;
      organizationId =
        context.organizationId;
    }

    await requireOrganizationAccess(
      organizationId,
    );

    let query = supabaseAdmin
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
      .eq(
        "project_id",
        resolvedProjectId,
      );

    if (environmentId) {
      query = query.eq(
        "environment_id",
        environmentId,
      );
    } else {
      query = query.is(
        "environment_id",
        null,
      );
    }

    const { data, error } =
      await query.order(
        "created_at",
        {
          ascending: false,
        },
      );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      providerCredentials: data ?? [],
    });
  } catch (error) {
    console.error(
      "GET provider credentials failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch provider credentials.";

    return NextResponse.json(
      { error: message },
      {
        status:
          message === "Unauthorized"
            ? 401
            : message.includes("Forbidden")
              ? 403
              : 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const user = await requireUser();

    const body = await request.json();

    const projectId =
      typeof body.projectId === "string"
        ? body.projectId.trim()
        : "";

    const environmentId =
      typeof body.environmentId === "string" &&
      body.environmentId.trim()
        ? body.environmentId.trim()
        : null;

    const providerName =
      typeof body.providerName === "string"
        ? body.providerName.trim()
        : "";

    const displayName =
      typeof body.displayName === "string"
        ? body.displayName.trim()
        : "";

    const secret =
      typeof body.secret === "string"
        ? body.secret.trim()
        : "";

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required." },
        { status: 400 },
      );
    }

    if (!providerName) {
      return NextResponse.json(
        {
          error:
            "providerName is required.",
        },
        { status: 400 },
      );
    }

    if (!secret) {
      return NextResponse.json(
        {
          error:
            "Provider API secret is required.",
        },
        { status: 400 },
      );
    }

    const projectContext =
      await getProjectContext(projectId);

    await requireOrganizationAccess(
      projectContext.organizationId,
    );

    if (environmentId) {
      const environmentContext =
        await getEnvironmentContext(
          environmentId,
        );

      if (
        environmentContext.projectId !==
        projectId
      ) {
        return NextResponse.json(
          {
            error:
              "Environment does not belong to the specified project.",
          },
          { status: 400 },
        );
      }
    }

    const now =
      new Date().toISOString();

    const { data, error } =
      await supabaseAdmin
        .from("provider_credentials")
        .insert({
          id: crypto.randomUUID(),
          project_id: projectId,
          environment_id: environmentId,
          provider_name: providerName,
          display_name:
            displayName || null,
          secret_ref: secret,
          status: "active",
          created_by: user.userId,
          rotated_at: now,
          created_at: now,
          updated_at: now,
        })
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

    return NextResponse.json(
      {
        providerCredential: data,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST provider credentials failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create provider credential.";

    return NextResponse.json(
      { error: message },
      {
        status:
          message === "Unauthorized"
            ? 401
            : message.includes("Forbidden")
              ? 403
              : 500,
      },
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  try {
    await requireUser();

    const body = await request.json();

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    const displayName =
      typeof body.displayName === "string"
        ? body.displayName.trim()
        : undefined;

    const secret =
      typeof body.secret === "string"
        ? body.secret.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Provider credential id is required.",
        },
        { status: 400 },
      );
    }

    const { data: existing, error } =
      await supabaseAdmin
        .from("provider_credentials")
        .select(
          `
            id,
            project_id,
            environment_id
          `,
        )
        .eq("id", id)
        .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Provider credential not found.",
        },
        { status: 404 },
      );
    }

    const context =
      await getProjectContext(
        existing.project_id,
      );

    await requireOrganizationAccess(
      context.organizationId,
    );

    const updates: Record<
      string,
      unknown
    > = {
      updated_at:
        new Date().toISOString(),
    };

    if (displayName !== undefined) {
      updates.display_name =
        displayName || null;
    }

    if (secret) {
      updates.secret_ref = secret;
      updates.rotated_at =
        new Date().toISOString();
      updates.status = "active";
    }

    const {
      data,
      error: updateError,
    } = await supabaseAdmin
      .from("provider_credentials")
      .update(updates)
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

    if (updateError) {
      throw new Error(
        updateError.message,
      );
    }

    return NextResponse.json({
      providerCredential: data,
    });
  } catch (error) {
    console.error(
      "PATCH provider credentials failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update provider credential.";

    return NextResponse.json(
      { error: message },
      {
        status:
          message === "Unauthorized"
            ? 401
            : message.includes("Forbidden")
              ? 403
              : 500,
      },
    );
  }
}

export async function DELETE(
  request: NextRequest,
) {
  try {
    await requireUser();

    const body = await request.json();

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Provider credential id is required.",
        },
        { status: 400 },
      );
    }

    const { data: existing, error } =
      await supabaseAdmin
        .from("provider_credentials")
        .select(
          "id, project_id",
        )
        .eq("id", id)
        .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Provider credential not found.",
        },
        { status: 404 },
      );
    }

    const context =
      await getProjectContext(
        existing.project_id,
      );

    await requireOrganizationAccess(
      context.organizationId,
    );

    const {
      data,
      error: updateError,
    } = await supabaseAdmin
      .from("provider_credentials")
      .update({
        status: "revoked",
        updated_at:
          new Date().toISOString(),
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

    if (updateError) {
      throw new Error(
        updateError.message,
      );
    }

    return NextResponse.json({
      providerCredential: data,
    });
  } catch (error) {
    console.error(
      "DELETE provider credentials failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to revoke provider credential.";

    return NextResponse.json(
      { error: message },
      {
        status:
          message === "Unauthorized"
            ? 401
            : message.includes("Forbidden")
              ? 403
              : 500,
      },
    );
  }
}