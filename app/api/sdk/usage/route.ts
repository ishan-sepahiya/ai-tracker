import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type ProviderName = "openai" | "anthropic" | "aws" | "gcp";

type SdkUsageBody = {
  provider_name: ProviderName | string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  endpoint?: string;
  request_id?: string;
  metadata?: Record<string, unknown>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token.trim();
}

export async function POST(request: Request) {
  const token = parseBearerToken(request.headers.get("Authorization"));
  if (!token) {
    return jsonError("Missing/invalid Authorization header", 401);
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
  if (!Number.isFinite(prompt_tokens) || !Number.isFinite(completion_tokens)) {
    return jsonError("prompt_tokens and completion_tokens are required numbers", 400);
  }
  if (!Number.isFinite(total_tokens)) {
    return jsonError("total_tokens is required number", 400);
  }

  // 1) Authenticate against profiles.api_token (server-to-server).
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("api_token", token)
    .maybeSingle();

  if (profileError) return jsonError(profileError.message, 500);
  if (!profile) return jsonError("Invalid api_token", 401);

  // 2) Find provider row for this user + provider_name.
  const { data: providerRow, error: providerError } = await supabaseAdmin
    .from("providers")
    .select("id")
    .eq("user_id", profile.id)
    .eq("provider_name", provider_name)
    .eq("is_active", true)
    .maybeSingle();

  if (providerError) return jsonError(providerError.message, 500);
  if (!providerRow) return jsonError("Provider not found", 404);

  const today = new Date().toISOString().slice(0, 10);

  // 3) Deduplicate when request_id is provided.
  if (request_id && typeof request_id === "string") {
    const { data: existingRow, error: existingError } = await supabaseAdmin
      .from("usage_records")
      .select("id,total_tokens")
      .eq("user_id", profile.id)
      .eq("provider_id", providerRow.id)
      .eq("date", today)
      .eq("request_id", request_id)
      .maybeSingle();

    if (existingError) return jsonError(existingError.message, 500);
    if (existingRow) {
      return NextResponse.json({
        success: true,
        recorded_tokens: existingRow.total_tokens,
        deduped: true,
      });
    }
  }

  // 4) Insert tokens. Cost is intentionally filled later by Analysis Engine.
  const raw_response = {
    ...(metadata ?? {}),
    // Ensure the analysis engine has enough info to compute costs later.
    model,
    endpoint: endpoint ?? null,
    usage: {
      input_tokens: prompt_tokens,
      output_tokens: completion_tokens,
    },
    request_id: request_id ?? null,
  };

  const { error: insertError, data: inserted } = await supabaseAdmin
    .from("usage_records")
    .insert({
      user_id: profile.id,
      provider_id: providerRow.id,
      date: today,
      total_tokens,
      prompt_tokens,
      completion_tokens,
      total_cost_usd: null,
      source: "sdk",
      request_id: request_id ?? null,
      raw_response,
      // Keep request_count consistent with "one record per API request".
      request_count: 1,
    })
    .select("total_tokens")
    .single();

  if (insertError) return jsonError(insertError.message, 500);

  return NextResponse.json({
    success: true,
    recorded_tokens: inserted?.total_tokens ?? total_tokens,
    deduped: false,
  });
}

