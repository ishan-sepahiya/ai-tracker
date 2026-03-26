import { NextResponse } from "next/server";

import { fetchOpenAIUsageRecord } from "@/lib/providers/openai";
import { fetchAnthropicUsageRecord } from "@/lib/providers/anthropic";
import { fetchAwsUsageRecord } from "@/lib/providers/aws";
import { fetchGcpUsageRecord } from "@/lib/providers/gcp";
import { decryptApiKey } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { computeCosts } from "@/lib/analysis/computeCosts";
import {
  sendAmberAlert,
  sendRedAlert,
  type AlertUser,
} from "@/lib/email";

type ProviderAdapter = (params: {
  userId: string;
  providerId: string;
  date: string;
  apiKey: string;
}) => Promise<{
  user_id: string;
  provider_id: string;
  date: string;
  total_cost_usd: number;
  total_tokens: number;
  request_count: number;
  raw_response: unknown;
}>;

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function isAuthorized(authHeader: string | null): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    throw new Error("Missing CRON_SECRET");
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request.headers.get("Authorization"))) {
    return unauthorizedResponse();
  }

  const now = new Date();
  const date = now.toISOString().slice(0, 10);

  // Monthly boundaries for budget calculations.
  const monthYear = `${now.getUTCFullYear()}-${String(
    now.getUTCMonth() + 1
  ).padStart(2, "0")}`;
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
  )
    .toISOString()
    .slice(0, 10);
  const monthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0)
  )
    .toISOString()
    .slice(0, 10);

  const { data: providers, error: providersError } = await supabaseAdmin
    .from("providers")
    .select("id, user_id, provider_name, api_key_encrypted")
    .eq("is_active", true);

  if (providersError) {
    return NextResponse.json(
      { error: `Failed to load providers: ${providersError.message}` },
      { status: 500 }
    );
  }

  const activeProviders = (providers ?? []) as Array<{
    id: string;
    user_id: string;
    provider_name: string;
    api_key_encrypted: string;
  }>;

  const results: Array<{
    providerId: string;
    ok: boolean;
    error?: string;
  }> = [];

  const adapterByProviderName: Record<string, ProviderAdapter> = {
    openai: fetchOpenAIUsageRecord,
    anthropic: fetchAnthropicUsageRecord,
    aws: fetchAwsUsageRecord,
    bedrock: fetchAwsUsageRecord,
    gcp: fetchGcpUsageRecord,
    vertex: fetchGcpUsageRecord,
  };

  async function upsertUsageRecordCron(params: {
    userId: string;
    providerId: string;
    date: string;
    total_cost_usd: number;
    total_tokens: number;
    request_count: number;
    raw_response: unknown;
  }) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("usage_records")
      .select("id")
      .eq("user_id", params.userId)
      .eq("provider_id", params.providerId)
      .eq("date", params.date)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);

    const payload = {
      user_id: params.userId,
      provider_id: params.providerId,
      date: params.date,
      total_cost_usd: params.total_cost_usd,
      total_tokens: params.total_tokens,
      request_count: params.request_count,
      raw_response: params.raw_response,
      source: "cron",
    };

    if (existing?.id) {
      const { error: updateError } = await supabaseAdmin
        .from("usage_records")
        .update(payload)
        .eq("id", existing.id);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("usage_records")
        .insert(payload);
      if (insertError) throw new Error(insertError.message);
    }
  }

  for (const provider of activeProviders) {
    try {
      const apiKey = decryptApiKey(provider.api_key_encrypted);
      const adapter = adapterByProviderName[provider.provider_name];
      if (!adapter) {
        throw new Error(
          `No billing adapter for provider_name=${provider.provider_name}`
        );
      }

      const usageRecord = await adapter({
        userId: provider.user_id,
        providerId: provider.id,
        date,
        apiKey,
      });

      await upsertUsageRecordCron({
        userId: provider.user_id,
        providerId: provider.id,
        date,
        total_cost_usd: usageRecord.total_cost_usd,
        total_tokens: usageRecord.total_tokens,
        request_count: usageRecord.request_count,
        raw_response: usageRecord.raw_response,
      });

      results.push({ providerId: provider.id, ok: true });
    } catch (error) {
      results.push({
        providerId: provider.id,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Fill in SDK rows that still have cost unset (invoice-level costs are already written).
  try {
    await computeCosts();
  } catch {
    // Don't fail the cron job if cost computation is unavailable.
  }

  // Budget check + alerts
  const userIds = Array.from(
    new Set(activeProviders.map((p) => p.user_id))
  );

  const [usageRowsRes, budgetsRes, alertsRes, profilesRes] = await Promise.all(
    [
      supabaseAdmin
        .from("usage_records")
        .select("user_id,total_cost_usd")
        .gte("date", monthStart)
        .lt("date", monthEnd)
        .in("user_id", userIds),
      supabaseAdmin
        .from("budgets")
        .select("user_id,monthly_limit_usd,alert_threshold_pct")
        .in("user_id", userIds),
      supabaseAdmin
        .from("alert_logs")
        .select("user_id,month_year")
        .eq("month_year", monthYear)
        .in("user_id", userIds),
      supabaseAdmin
        .from("profiles")
        .select("id,email,full_name")
        .in("id", userIds),
    ]
  );

  const usageRows = (usageRowsRes.data ?? []) as Array<{
    user_id: string;
    total_cost_usd: number | null;
  }>;
  const budgets = (budgetsRes.data ?? []) as Array<{
    user_id: string;
    monthly_limit_usd: number | null;
    alert_threshold_pct: number | null;
  }>;
  const alerts = (alertsRes.data ?? []) as Array<{ user_id: string }>;
  const profiles = (profilesRes.data ?? []) as Array<{
    id: string;
    email: string | null;
    full_name: string | null;
  }>;

  const spendByUser = new Map<string, number>();
  for (const row of usageRows) {
    if (row.total_cost_usd == null) continue;
    spendByUser.set(
      row.user_id,
      (spendByUser.get(row.user_id) ?? 0) + Number(row.total_cost_usd)
    );
  }

  const limitByUser = new Map<string, number>();
  const thresholdByUser = new Map<string, number>();
  for (const b of budgets) {
    if (b.monthly_limit_usd == null) continue;
    limitByUser.set(
      b.user_id,
      (limitByUser.get(b.user_id) ?? 0) + Number(b.monthly_limit_usd)
    );
    if (b.alert_threshold_pct != null) {
      const existing = thresholdByUser.get(b.user_id);
      const v = Number(b.alert_threshold_pct);
      thresholdByUser.set(
        b.user_id,
        existing == null ? v : Math.min(existing, v)
      );
    }
  }

  const alertedThisMonth = new Set(alerts.map((a) => a.user_id));
  const profileById = new Map(
    profiles.map((p) => [
      p.id,
      { email: p.email ?? "", full_name: p.full_name ?? null } as AlertUser,
    ])
  );

  let alerts_sent = 0;

  for (const userId of userIds) {
    const spend = spendByUser.get(userId) ?? 0;
    const limit = limitByUser.get(userId) ?? 0;
    const thresholdPct = thresholdByUser.get(userId) ?? 100;
    if (limit <= 0) continue;

    const pct = (spend / limit) * 100;
    const shouldAlert = pct >= thresholdPct;
    if (!shouldAlert) continue;
    if (alertedThisMonth.has(userId)) continue;

    const profile = profileById.get(userId);
    if (!profile || !profile.email) continue;

    const alertType: "amber" | "red" =
      pct >= 100 ? "red" : "amber";

    const message = `Spend ${spend.toFixed(2)} exceeded threshold: ${thresholdPct}% (${pct.toFixed(
      0
    )}%) with monthly limit ${limit.toFixed(2)}.`;

    const { error: alertInsertError } = await supabaseAdmin
      .from("alert_logs")
      .insert({
        user_id: userId,
        alert_type: alertType,
        message,
        sent_at: now.toISOString(),
        month_year: monthYear,
      });

    if (!alertInsertError) {
      // Best-effort email; alert_logs is authoritative for "no duplicates this month".
      try {
        if (alertType === "red") {
          await sendRedAlert(profile, spend, limit);
        } else {
          await sendAmberAlert(profile, spend, limit, pct);
        }
        alerts_sent++;
      } catch {
        // ignore email failures
      }
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return NextResponse.json({
    processed: results.length,
    succeeded,
    failed,
    alerts_sent,
  });
}
