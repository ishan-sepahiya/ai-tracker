import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { requireUser } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrganizationAccess } from "@/lib/api-management/authorization";

async function getEnvironmentContext(environmentId: string) {
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

  const department = Array.isArray(project.departments)
    ? project.departments[0]
    : project.departments;

  if (!department) {
    throw new Error("Department not found");
  }

  return {
    environmentId: data.id,
    projectId: project.id,
    organizationId: department.organization_id,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    const environmentId =
      request.nextUrl.searchParams.get("environmentId");

    if (!environmentId) {
      return NextResponse.json(
        { error: "environmentId is required." },
        { status: 400 },
      );
    }

    const context = await getEnvironmentContext(environmentId);

    await requireOrganizationAccess(context.organizationId);

    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .select(
        `
          id,
          user_id,
          project_id,
          environment_id,
          name,
          last_used,
          expires_at,
          created_at,
          revoked,
          daily_budget
        `,
      )
      .eq("environment_id", environmentId)
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      apiKeys: data ?? [],
    });
  } catch (error) {
    console.error("GET /api/team/api-keys failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch API keys.";

    const status =
      message === "Unauthorized"
        ? 401
        : message.includes("Forbidden")
          ? 403
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    const body = await request.json();

    const environmentId =
      typeof body.environmentId === "string"
        ? body.environmentId.trim()
        : "";

    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : "Default API Key";

    const dailyBudget =
      body.dailyBudget === null ||
      body.dailyBudget === undefined ||
      body.dailyBudget === ""
        ? null
        : Number(body.dailyBudget);

    const expiresAt =
      typeof body.expiresAt === "string" && body.expiresAt.trim()
        ? body.expiresAt.trim()
        : null;

    if (!environmentId) {
      return NextResponse.json(
        { error: "environmentId is required." },
        { status: 400 },
      );
    }

    if (dailyBudget !== null && !Number.isFinite(dailyBudget)) {
      return NextResponse.json(
        { error: "dailyBudget must be a valid number." },
        { status: 400 },
      );
    }

    const context = await getEnvironmentContext(environmentId);

    await requireOrganizationAccess(context.organizationId);

    const rawKey = `ait_${crypto.randomBytes(32).toString("hex")}`;

    const keyHash = crypto
      .createHash("sha256")
      .update(rawKey)
      .digest("hex");

    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .insert({
        id: crypto.randomUUID(),
        user_id: user.userId,
        project_id: context.projectId,
        environment_id: environmentId,
        name,
        key_hash: keyHash,
        expires_at: expiresAt,
        revoked: false,
        daily_budget: dailyBudget,
        created_at: new Date().toISOString(),
      })
      .select(
        `
          id,
          user_id,
          project_id,
          environment_id,
          name,
          last_used,
          expires_at,
          created_at,
          revoked,
          daily_budget
        `,
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        apiKey: data,
        key: rawKey,
        warning:
          "This API key is shown only once. Store it securely; it cannot be recovered later.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/team/api-keys failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create API key.";

    const status =
      message === "Unauthorized"
        ? 401
        : message.includes("Forbidden")
          ? 403
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireUser();

    const body = await request.json();

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        { error: "API key id is required." },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "API key name is required." },
        { status: 400 },
      );
    }

    const { data: existingKey, error: lookupError } =
      await supabaseAdmin
        .from("api_keys")
        .select("id, environment_id")
        .eq("id", id)
        .maybeSingle();

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    if (!existingKey) {
      return NextResponse.json(
        { error: "API key not found." },
        { status: 404 },
      );
    }

    const context = await getEnvironmentContext(
      existingKey.environment_id,
    );

    await requireOrganizationAccess(context.organizationId);

    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .update({
        name,
      })
      .eq("id", id)
      .select(
        `
          id,
          user_id,
          project_id,
          environment_id,
          name,
          last_used,
          expires_at,
          created_at,
          revoked,
          daily_budget
        `,
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      apiKey: data,
    });
  } catch (error) {
    console.error("PATCH /api/team/api-keys failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update API key.";

    const status =
      message === "Unauthorized"
        ? 401
        : message.includes("Forbidden")
          ? 403
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireUser();

    const body = await request.json();

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        { error: "API key id is required." },
        { status: 400 },
      );
    }

    const { data: existingKey, error: lookupError } =
      await supabaseAdmin
        .from("api_keys")
        .select("id, environment_id")
        .eq("id", id)
        .maybeSingle();

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    if (!existingKey) {
      return NextResponse.json(
        { error: "API key not found." },
        { status: 404 },
      );
    }

    const context = await getEnvironmentContext(
      existingKey.environment_id,
    );

    await requireOrganizationAccess(context.organizationId);

    // Revoke instead of physically deleting the key.
    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .update({
        revoked: true,
      })
      .eq("id", id)
      .select(
        `
          id,
          user_id,
          project_id,
          environment_id,
          name,
          last_used,
          expires_at,
          created_at,
          revoked,
          daily_budget
        `,
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      apiKey: data,
    });
  } catch (error) {
    console.error("DELETE /api/team/api-keys failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to revoke API key.";

    const status =
      message === "Unauthorized"
        ? 401
        : message.includes("Forbidden")
          ? 403
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}