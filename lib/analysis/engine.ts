"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type UsageRecordCostRow = {
  id: string;
  user_id: string;
  provider_id: string;
  date: string;
  raw_response: unknown;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function safeJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function getModelFromRawResponse(raw_response: unknown): string | null {
  const obj = safeJsonObject(raw_response);
  if (!obj) return null;
  const model =
    (typeof obj.model === "string" ? obj.model : null) ??
    (typeof obj.model_name === "string" ? obj.model_name : null) ??
    (typeof obj.modelName === "string" ? obj.modelName : null);
  return model;
}

function getInputOutputTokensFromRawResponse(raw_response: unknown): {
  inputTokens: number | null;
  outputTokens: number | null;
} {
  const obj = safeJsonObject(raw_response) ?? {};
  const usage = (obj.usage as Record<string, unknown> | undefined) ?? {};

  const inputTokens =
    toNumber(usage.input_tokens) ??
    toNumber(usage.inputTokens) ??
    toNumber(obj.input_tokens) ??
    toNumber(obj.inputTokens) ??
    null;

  const outputTokens =
    toNumber(usage.output_tokens) ??
    toNumber(usage.outputTokens) ??
    toNumber(obj.output_tokens) ??
    toNumber(obj.outputTokens) ??
    null;

  return { inputTokens, outputTokens };
}

function formatDateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthYearToBounds(month_year: string): { start: string; end: string } {
  // month_year: "YYYY-MM"
  const [yStr, mStr] = month_year.split("-");
  const y = Number(yStr);
  const m = Number(mStr); // 1..12
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    throw new Error(`Invalid month_year: ${month_year}`);
  }
  const start = formatDateISO(new Date(Date.UTC(y, m - 1, 1, 0, 0, 0)));
  const end = formatDateISO(new Date(Date.UTC(y, m, 1, 0, 0, 0)));
  return { start, end };
}

function daysInMonthUTC(now: Date): number {
  // Use JS date overflow to compute last day.
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-based
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function buildLastNDatesUTC(days: number, endDate: Date): string[] {
  const result: string[] = [];
  const end = new Date(Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
    0,
    0,
    0
  ));
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    result.push(formatDateISO(d));
  }
  return result;
}

export async function computeCosts(userId?: string) {
  const query = supabaseAdmin
    .from("usage_records")
    .select("id,user_id,provider_id,date,raw_response")
    .eq("source", "sdk")
    .is("total_cost_usd", null);

  if (userId) query.eq("user_id", userId);

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  const usageRows = (rows ?? []) as UsageRecordCostRow[];
  if (!usageRows.length) {
    return { updated: 0, attempted: 0, failed: 0 };
  }

  const providerIds = Array.from(new Set(usageRows.map((r) => r.provider_id)));
  const { data: providerRows, error: providerError } = await supabaseAdmin
    .from("providers")
    .select("id, provider_name")
    .in("id", providerIds);

  if (providerError) throw new Error(providerError.message);

  const providerNameById = new Map(
    (providerRows ?? []).map((p) => [p.id, p.provider_name] as const)
  );

  let updated = 0;
  let failed = 0;

  for (const row of usageRows) {
    try {
      const providerName = providerNameById.get(row.provider_id);
      if (!providerName) {
        failed++;
        continue;
      }

      const model = getModelFromRawResponse(row.raw_response);
      if (!model) {
        failed++;
        continue;
      }

      const fallbackTokens = getInputOutputTokensFromRawResponse(
        row.raw_response
      );

      const promptTokens = fallbackTokens.inputTokens;
      const completionTokens = fallbackTokens.outputTokens;

      if (promptTokens == null || completionTokens == null) {
        failed++;
        continue;
      }

      const { data: pricingRows, error: pricingError } = await supabaseAdmin
        .from("model_pricing")
        .select("input_rate_per_1k, output_rate_per_1k")
        .eq("provider_name", providerName)
        .eq("model", model)
        .order("effective_date", { ascending: false })
        .limit(1);

      if (pricingError) throw new Error(pricingError.message);

      const pricing = pricingRows?.[0] as
        | {
            input_rate_per_1k: string | number | null;
            output_rate_per_1k: string | number | null;
          }
        | undefined;

      if (!pricing) {
        failed++;
        continue;
      }

      const inputRate = toNumber(pricing.input_rate_per_1k) ?? 0;
      const outputRate = toNumber(pricing.output_rate_per_1k) ?? 0;

      const cost =
        (promptTokens / 1000) * inputRate +
        (completionTokens / 1000) * outputRate;

      const { error: updateError } = await supabaseAdmin
        .from("usage_records")
        .update({ total_cost_usd: cost })
        .eq("id", row.id);

      if (updateError) throw updateError;

      updated++;
    } catch {
      failed++;
    }
  }

  return { updated, attempted: usageRows.length, failed };
}

export async function aggregateByProvider(userId: string, month_year: string) {
  const { start, end } = monthYearToBounds(month_year);

  const { data: rows, error } = await supabaseAdmin
    .from("usage_records")
    .select("provider_id,total_cost_usd,total_tokens,request_count")
    .eq("user_id", userId)
    .gte("date", start)
    .lt("date", end)
    .not("total_cost_usd", "is", null);

  if (error) throw new Error(error.message);

  const recordRows = (rows ?? []) as Array<{
    provider_id: string;
    total_cost_usd: number | null;
    total_tokens: number | null;
    request_count: number | null;
  }>;

  const totalsByProvider = new Map<
    string,
    { total_cost_usd: number; total_tokens: number; request_count: number }
  >();

  for (const r of recordRows) {
    const acc =
      totalsByProvider.get(r.provider_id) ?? {
        total_cost_usd: 0,
        total_tokens: 0,
        request_count: 0,
      };

    acc.total_cost_usd += Number(r.total_cost_usd ?? 0);
    acc.total_tokens += Number(r.total_tokens ?? 0);
    acc.request_count += Number(r.request_count ?? 0);
    totalsByProvider.set(r.provider_id, acc);
  }

  const providerIds = Array.from(totalsByProvider.keys());
  if (!providerIds.length) return [];

  const { data: providerRows, error: providerError } = await supabaseAdmin
    .from("providers")
    .select("id, provider_name")
    .in("id", providerIds);
  if (providerError) throw new Error(providerError.message);

  const providerNameById = new Map(
    (providerRows ?? []).map((p) => [p.id, p.provider_name] as const)
  );

  return Array.from(totalsByProvider.entries()).map(([providerId, t]) => ({
    provider_name: providerNameById.get(providerId) ?? providerId,
    total_cost_usd: t.total_cost_usd,
    total_tokens: t.total_tokens,
    request_count: t.request_count,
  }));
}

export async function getDailySpend(userId: string, days = 30) {
  const now = new Date();
  const startDates = buildLastNDatesUTC(days, now);

  const start = startDates[0];
  const end = formatDateISO(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  );

  const { data: rows, error } = await supabaseAdmin
    .from("usage_records")
    .select("date,total_cost_usd,total_tokens")
    .eq("user_id", userId)
    .gte("date", start)
    .lt("date", end)
    .not("total_cost_usd", "is", null);

  if (error) throw new Error(error.message);

  const byDate = new Map<string, { total_cost_usd: number; total_tokens: number }>();
  for (const d of startDates) {
    byDate.set(d, { total_cost_usd: 0, total_tokens: 0 });
  }

  for (const r of (rows ?? []) as Array<{
    date: string;
    total_cost_usd: number | null;
    total_tokens: number | null;
  }>) {
    const acc = byDate.get(r.date);
    if (!acc) continue;
    acc.total_cost_usd += Number(r.total_cost_usd ?? 0);
    acc.total_tokens += Number(r.total_tokens ?? 0);
  }

  return startDates.map((date) => ({
    date,
    total_cost_usd: byDate.get(date)!.total_cost_usd,
    total_tokens: byDate.get(date)!.total_tokens,
  }));
}

export async function detectAnomalies(userId: string) {
  const daily = await getDailySpend(userId, 30);

  const anomalies: Array<{
    date: string;
    spend: number;
    rolling_avg: number;
    severity: "warning" | "critical";
  }> = [];

  for (let i = 7; i < daily.length; i++) {
    const window = daily.slice(i - 7, i);
    const rollingAvg =
      window.reduce((sum, x) => sum + x.total_cost_usd, 0) / window.length;
    const spend = daily[i].total_cost_usd;

    if (rollingAvg <= 0) continue;
    if (spend > 2 * rollingAvg) {
      const severity = spend > 3 * rollingAvg ? "critical" : "warning";
      anomalies.push({ date: daily[i].date, spend, rolling_avg: rollingAvg, severity });
    }
  }

  return anomalies;
}

export async function computeForecast(userId: string) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysInMonth = daysInMonthUTC(now);
  const dayOfMonth = today.getUTCDate(); // 1..31
  const daysRemaining = daysInMonth - dayOfMonth;

  const daily = await getDailySpend(userId, 30);
  const total = daily.reduce((sum, d) => sum + d.total_cost_usd, 0);
  const avgDaily = total / daily.length;

  const projected_total_usd = avgDaily * daysInMonth;

  const { data: budgetRows, error: budgetError } = await supabaseAdmin
    .from("budgets")
    .select("monthly_limit_usd")
    .eq("user_id", userId);

  if (budgetError) throw new Error(budgetError.message);

  const monthly_limit_usd = (budgetRows ?? []).reduce((sum, r) => sum + Number(r.monthly_limit_usd ?? 0), 0);

  const will_exceed = monthly_limit_usd > 0 && projected_total_usd > monthly_limit_usd;
  const pct_of_budget =
    monthly_limit_usd > 0 ? (projected_total_usd / monthly_limit_usd) * 100 : 0;

  return {
    projected_total_usd,
    days_remaining: daysRemaining,
    monthly_limit_usd,
    will_exceed,
    pct_of_budget,
  };
}

export async function compareProviderCosts(userId: string, month_year: string) {
  const { start, end } = monthYearToBounds(month_year);

  const { data: rows, error } = await supabaseAdmin
    .from("usage_records")
    .select("provider_id,total_cost_usd")
    .eq("user_id", userId)
    .gte("date", start)
    .lt("date", end)
    .not("total_cost_usd", "is", null);

  if (error) throw new Error(error.message);

  const totalsByProvider = new Map<string, number>();
  for (const r of (rows ?? []) as Array<{
    provider_id: string;
    total_cost_usd: number | null;
  }>) {
    totalsByProvider.set(
      r.provider_id,
      (totalsByProvider.get(r.provider_id) ?? 0) + Number(r.total_cost_usd ?? 0)
    );
  }

  const providerIds = Array.from(totalsByProvider.keys());
  const { data: providerRows, error: providerError } = await supabaseAdmin
    .from("providers")
    .select("id, provider_name")
    .in("id", providerIds);

  if (providerError) throw new Error(providerError.message);

  const providerNameById = new Map(
    (providerRows ?? []).map((p) => [p.id, p.provider_name] as const)
  );

  const totalSpend = Array.from(totalsByProvider.values()).reduce((a, b) => a + b, 0);
  if (totalSpend <= 0) {
    return [];
  }

  const breakdown = Array.from(totalsByProvider.entries()).map(
    ([providerId, cost]) => ({
      provider_name: providerNameById.get(providerId) ?? providerId,
      total_cost_usd: cost,
      pct_share: (cost / totalSpend) * 100,
    })
  );

  breakdown.sort((a, b) => b.total_cost_usd - a.total_cost_usd);
  return breakdown;
}

