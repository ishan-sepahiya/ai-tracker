import { NextResponse } from "next/server";
import crypto from "crypto";

import { supabaseAdmin } from "@/lib/supabase-admin";

type SdkUsageBody = {
  provider_name: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  endpoint?: string;
  request_id?: string;
  metadata?: Record<string, unknown>;
};

type RequestIdentity = {
  userId: string;
  organizationId: string | null;
  projectId: string | null;
  environmentId: string | null;
  sdkKeyId: string | null;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/* =========================================================
   Authentication
========================================================= */

function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
}

function hashApiKey(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function authenticateTeamApiKey(
  token: string,
): Promise<RequestIdentity | null> {
  const keyHash = hashApiKey(token);

  const { data: apiKey, error: apiKeyError } = await supabaseAdmin
    .from("api_keys")
    .select(`
      id,
      user_id,
      project_id,
      environment_id,
      revoked,
      expires_at
    `)
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (apiKeyError) {
    throw new Error(apiKeyError.message);
  }

  if (!apiKey) {
    return null;
  }

  if (apiKey.revoked) {
    throw new Error("API key has been revoked");
  }

  if (apiKey.expires_at) {
    const expiresAt = new Date(apiKey.expires_at);

    if (
      Number.isFinite(expiresAt.getTime()) &&
      expiresAt <= new Date()
    ) {
      throw new Error("API key has expired");
    }
  }

  if (!apiKey.project_id || !apiKey.environment_id) {
    throw new Error(
      "API key is not linked to a project and environment",
    );
  }

  const { data: environment, error: environmentError } =
    await supabaseAdmin
      .from("environments")
      .select(`
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
      `)
      .eq("id", apiKey.environment_id)
      .maybeSingle();

  if (environmentError) {
    throw new Error(environmentError.message);
  }

  if (!environment) {
    throw new Error("API key environment not found");
  }

  const project = Array.isArray(environment.projects)
    ? environment.projects[0]
    : environment.projects;

  if (!project) {
    throw new Error("API key project not found");
  }

  if (project.id !== apiKey.project_id) {
    throw new Error(
      "API key project/environment relationship is invalid",
    );
  }

  const department = Array.isArray(project.departments)
    ? project.departments[0]
    : project.departments;

  if (!department) {
    throw new Error("API key department not found");
  }

  return {
    userId: apiKey.user_id,
    organizationId: department.organization_id,
    projectId: apiKey.project_id,
    environmentId: apiKey.environment_id,
    sdkKeyId: apiKey.id,
  };
}

async function authenticateLegacyToken(
  token: string,
): Promise<RequestIdentity | null> {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("api_token", token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!profile) {
    return null;
  }

  return {
    userId: profile.id,
    organizationId: null,
    projectId: null,
    environmentId: null,
    sdkKeyId: null,
  };
}

async function authenticateRequest(
  token: string,
): Promise<RequestIdentity> {
  const teamIdentity = await authenticateTeamApiKey(token);

  if (teamIdentity) {
    return teamIdentity;
  }

  const legacyIdentity = await authenticateLegacyToken(token);

  if (legacyIdentity) {
    return legacyIdentity;
  }

  throw new Error("Invalid API key");
}

/* =========================================================
   Idempotency helpers
========================================================= */

function getUsageDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function findExistingSdkUsage(
  identity: RequestIdentity,
  providerId: string,
  usageDate: string,
  requestId: string,
) {
  let query = supabaseAdmin
    .from("usage_records")
    .select("id,total_tokens")
    .eq("user_id", identity.userId)
    .eq("provider_id", providerId)
    .eq("date", usageDate)
    .eq("source", "sdk")
    .eq("request_id", requestId);

  if (identity.sdkKeyId) {
    query = query.eq("sdk_key_id", identity.sdkKeyId);
  } else {
    query = query.is("sdk_key_id", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function markApiKeyUsed(sdkKeyId: string | null) {
  if (!sdkKeyId) {
    return;
  }

  const { error } = await supabaseAdmin
    .from("api_keys")
    .update({
      last_used: new Date().toISOString(),
    })
    .eq("id", sdkKeyId);

  if (error) {
    console.error(
      "Failed to update API key last_used:",
      error,
    );
  }
}

/* =========================================================
   Main endpoint
========================================================= */

export async function POST(request: Request) {
  const token = parseBearerToken(
    request.headers.get("Authorization"),
  );

  if (!token) {
    return jsonError(
      "Missing/invalid Authorization header",
      401,
    );
  }

  let body: SdkUsageBody;

  try {
    body = (await request.json()) as SdkUsageBody;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const {
    provider_name,
    model,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    endpoint,
    request_id,
    metadata,
  } = body ?? ({} as SdkUsageBody);

  if (!provider_name || typeof provider_name !== "string") {
    return jsonError("provider_name is required", 400);
  }

  if (!model || typeof model !== "string") {
    return jsonError("model is required", 400);
  }

  if (
    !Number.isFinite(prompt_tokens) ||
    !Number.isFinite(completion_tokens)
  ) {
    return jsonError(
      "prompt_tokens and completion_tokens are required numbers",
      400,
    );
  }

  if (!Number.isFinite(total_tokens)) {
    return jsonError(
      "total_tokens is required number",
      400,
    );
  }

  if (
    prompt_tokens < 0 ||
    completion_tokens < 0 ||
    total_tokens < 0
  ) {
    return jsonError(
      "Token values cannot be negative",
      400,
    );
  }

  let identity: RequestIdentity;

  try {
    identity = await authenticateRequest(token);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid API key";

    return jsonError(message, 401);
  }

  const {
    data: providerRow,
    error: providerError,
  } = await supabaseAdmin
    .from("providers")
    .select(`
      id,
      provider_name
    `)
    .eq("user_id", identity.userId)
    .eq("provider_name", provider_name)
    .eq("is_active", true)
    .maybeSingle();

  if (providerError) {
    return jsonError(providerError.message, 500);
  }

  if (!providerRow) {
    return jsonError("Provider not found", 404);
  }

  let providerCredentialId: string | null = null;

  if (identity.projectId && identity.environmentId) {
    const {
      data: credentialRows,
      error: credentialError,
    } = await supabaseAdmin
      .from("provider_credentials")
      .select("id")
      .eq("project_id", identity.projectId)
      .eq("environment_id", identity.environmentId)
      .eq("provider_name", provider_name)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    if (credentialError) {
      return jsonError(credentialError.message, 500);
    }

    providerCredentialId = credentialRows?.[0]?.id ?? null;
  }

  const usageDate = getUsageDate();
  const normalizedRequestId =
    typeof request_id === "string" ? request_id.trim() : "";

  /* -------------------------------------------------------
     1. Fast-path duplicate check
  ------------------------------------------------------- */

  if (normalizedRequestId) {
    try {
      const existingRow = await findExistingSdkUsage(
        identity,
        providerRow.id,
        usageDate,
        normalizedRequestId,
      );

      if (existingRow) {
        await markApiKeyUsed(identity.sdkKeyId);

        return NextResponse.json({
          success: true,
          recorded_tokens: existingRow.total_tokens,
          deduped: true,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to check existing usage record";

      return jsonError(message, 500);
    }
  }

  const raw_response = {
    ...(metadata ?? {}),
    model,
    endpoint: endpoint ?? null,
    usage: {
      input_tokens: prompt_tokens,
      output_tokens: completion_tokens,
    },
    request_id: normalizedRequestId || null,
  };

  const traceId =
    typeof metadata?.trace_id === "string"
      ? metadata.trace_id
      : null;

  /* -------------------------------------------------------
     2. Insert usage record
  ------------------------------------------------------- */

  const {
    error: insertError,
    data: inserted,
  } = await supabaseAdmin
    .from("usage_records")
    .insert({
      user_id: identity.userId,
      provider_id: providerRow.id,

      organization_id: identity.organizationId,
      project_id: identity.projectId,
      environment_id: identity.environmentId,
      sdk_key_id: identity.sdkKeyId,
      provider_credential_id: providerCredentialId,

      date: usageDate,
      total_tokens,
      prompt_tokens,
      completion_tokens,
      total_cost_usd: null,
      source: "sdk",
      request_id: normalizedRequestId || null,
      raw_response,
      request_count: 1,
      trace_id: traceId,

      actor_id: identity.sdkKeyId ?? null,
      actor_type: identity.sdkKeyId ? "api_key" : null,
    })
    .select("id,total_tokens")
    .single();

  /* -------------------------------------------------------
     3. Database-enforced race-safe deduplication
  ------------------------------------------------------- */

  if (insertError) {
    if (
      insertError.code === "23505" &&
      normalizedRequestId
    ) {
      try {
        const existingRow = await findExistingSdkUsage(
          identity,
          providerRow.id,
          usageDate,
          normalizedRequestId,
        );

        if (existingRow) {
          await markApiKeyUsed(identity.sdkKeyId);

          return NextResponse.json({
            success: true,
            recorded_tokens: existingRow.total_tokens,
            deduped: true,
          });
        }
      } catch (error) {
        console.error(
          "Failed to resolve SDK usage duplicate:",
          error,
        );
      }
    }

    return jsonError(insertError.message, 500);
  }

  /* -------------------------------------------------------
     4. Update API key last-used timestamp
  ------------------------------------------------------- */

  await markApiKeyUsed(identity.sdkKeyId);

  return NextResponse.json({
    success: true,
    recorded_tokens:
      inserted?.total_tokens ?? total_tokens,
    deduped: false,
    organization_id: identity.organizationId,
    project_id: identity.projectId,
    environment_id: identity.environmentId,
    sdk_key_id: identity.sdkKeyId,
  });
}
