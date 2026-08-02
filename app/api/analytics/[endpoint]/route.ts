import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireUser } from "@/lib/auth/server";

type AnalyticsRange = "24h" | "7d" | "30d";

type UsageRecordRow = {
  date: string;
  provider?: string | null;
  model?: string | null;
  stop_reason?: string | null;
  total_cost_usd?: number | null;
  total_tokens?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  request_count?: number | null;
  request_id?: string | null;
  created_at?: string | null;
  raw_response?: unknown;
};

type DateValueMap = Record<string, number>;

type RequestRow = {
  request_id: string | null;
  created_at: string | null;
  provider: string | null;
  model: string | null;
  stop_reason: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_cost_usd: number | null;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatDateISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getStartDateForRange(range: AnalyticsRange) {
  const now = new Date();
  if (range === "24h") {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  if (range === "7d") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

function normalizeInputTokens(row: UsageRecordRow): number {
  return (
    toNumber(row.input_tokens) ??
    toNumber(row.prompt_tokens) ??
    toNumber(row.total_tokens) ??
    0
  );
}

function normalizeOutputTokens(row: UsageRecordRow): number {
  return (
    toNumber(row.output_tokens) ??
    toNumber(row.completion_tokens) ??
    0
  );
}

function normalizeCost(row: UsageRecordRow): number {
  return toNumber(row.total_cost_usd) ?? 0;
}

function normalizeTokenCount(row: UsageRecordRow): number {
  return toNumber(row.total_tokens) ?? normalizeInputTokens(row) + normalizeOutputTokens(row);
}

function extractLatency(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const candidates = [
    "latency_ms",
    "duration_ms",
    "response_time_ms",
    "round_trip_ms",
    "latency",
    "duration",
    "response_ms",
  ];

  for (const key of candidates) {
    const value = obj[key];
    const num = toNumber(value);
    if (num != null && num >= 0) return num;
  }

  if (typeof obj.duration === "string" && obj.duration.endsWith("ms")) {
    return toNumber(obj.duration.replace("ms", ""));
  }

  return null;
}

function extractCacheSavings(raw: unknown): { saved: number; tokens: number } {
  if (!raw || typeof raw !== "object") return { saved: 0, tokens: 0 };
  const obj = raw as Record<string, unknown>;

  const tokens = toNumber(obj.cache_tokens) ?? toNumber(obj.cached_tokens) ?? 0;
  const saved = toNumber(obj.saved_usd) ?? toNumber(obj.saved_cost_usd) ?? 0;

  return { saved, tokens };
}

function getRangeParam(url: URL): AnalyticsRange {
  const raw = url.searchParams.get("range") as AnalyticsRange | null;
  if (raw === "24h" || raw === "7d" || raw === "30d") return raw;
  return "7d";
}

function getUpperDate(): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return formatDateISO(tomorrow);
}

async function fetchUsageRows(userId: string, startDate: string, endDate: string) {
  const { data, error } = await supabaseAdmin
    .from<UsageRecordRow>("usage_records")
    .select(
      `date, provider, model, stop_reason, total_cost_usd, total_tokens, input_tokens, output_tokens, prompt_tokens, completion_tokens, request_count, request_id, created_at, raw_response`
    )
    .gte("date", startDate)
    .lt("date", endDate)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function groupByDateModel(rows: UsageRecordRow[]) {
  const dateMap = new Map<string, Record<string, number>>();
  const models = new Set<string>();

  rows.forEach((row) => {
    const date = row.date;
    if (!date) return;
    const model = row.model?.trim() || "unknown";
    models.add(model);
    const count = normalizeTokenCount(row);
    const current = dateMap.get(date) ?? {};
    current[model] = (current[model] ?? 0) + count;
    dateMap.set(date, current);
  });

  const sortedDates = Array.from(dateMap.keys()).sort();
  return {
    models: Array.from(models).sort(),
    data: sortedDates.map((date) => ({ date, ...dateMap.get(date)! })),
  };
}

function groupByProviderDate(rows: UsageRecordRow[]) {
  const dateMap = new Map<string, Record<string, number>>();
  const providers = new Set<string>();

  rows.forEach((row) => {
    const date = row.date;
    if (!date) return;
    const provider = row.provider?.trim() || "unknown";
    providers.add(provider);
    const count = normalizeTokenCount(row);
    const current = dateMap.get(date) ?? {};
    current[provider] = (current[provider] ?? 0) + count;
    dateMap.set(date, current);
  });

  const sortedDates = Array.from(dateMap.keys()).sort();
  return {
    providers: Array.from(providers).sort(),
    data: sortedDates.map((date) => ({ date, ...dateMap.get(date)! })),
  };
}

function groupStopReasons(rows: UsageRecordRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const reason = row.stop_reason?.trim() || "n/a";
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  });
  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

function computeAverageLatency(rows: UsageRecordRow[]) {
  const totals = new Map<string, { sum: number; count: number }>();
  rows.forEach((row) => {
    const model = row.model?.trim() || "unknown";
    const latency = extractLatency(row.raw_response);
    if (latency == null) return;
    const current = totals.get(model) ?? { sum: 0, count: 0 };
    current.sum += latency;
    current.count += 1;
    totals.set(model, current);
  });

  return Array.from(totals.entries())
    .map(([model, { sum, count }]) => ({ model, latency: sum / count }))
    .sort((a, b) => a.latency - b.latency);
}

function computeCacheSavings(rows: UsageRecordRow[]) {
  let saved_usd = 0;
  let cache_tokens = 0;

  rows.forEach((row) => {
    const result = extractCacheSavings(row.raw_response);
    saved_usd += result.saved;
    cache_tokens += result.tokens;
  });

  return { saved_usd, cache_tokens };
}

function buildSummary(rows: UsageRecordRow[], range: AnalyticsRange) {
  const result = {
    range,
    request_count: 0,
    total_cost: 0,
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
  };

  rows.forEach((row) => {
    result.total_cost += normalizeCost(row);
    result.input_tokens += normalizeInputTokens(row);
    result.output_tokens += normalizeOutputTokens(row);
    result.total_tokens += normalizeTokenCount(row);
    result.request_count += toNumber(row.request_count) ?? 1;
  });

  return result;
}

export async function GET(
  request: Request,
  context: { params: { endpoint: string } | Promise<{ endpoint: string }> }
) {
  const { endpoint } = await context.params;
  let userId: string;
  try {
    const auth = await requireUser();
    userId = auth.userId;
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const range = getRangeParam(url);
  const startDate = formatDateISO(getStartDateForRange(range));
  const endDate = getUpperDate();

  try {
    const rows = await fetchUsageRows(userId, startDate, endDate);

    if (endpoint === "summary") {
      return NextResponse.json(buildSummary(rows, range));
    }

    if (endpoint === "stacked-tokens") {
      return NextResponse.json(groupByDateModel(rows));
    }

    if (endpoint === "market-share") {
      return NextResponse.json(groupByProviderDate(rows));
    }

    if (endpoint === "stop-reasons") {
      return NextResponse.json({ range, data: groupStopReasons(rows) });
    }

    if (endpoint === "token-scatter") {
      return NextResponse.json({
        range,
        data: rows
          .map((row) => ({
            model: row.model ?? "unknown",
            input: normalizeInputTokens(row),
            output: normalizeOutputTokens(row),
          }))
          .filter((entry) => entry.input > 0 || entry.output > 0),
      });
    }

    if (endpoint === "cache-savings") {
      return NextResponse.json({ range, ...computeCacheSavings(rows) });
    }

    if (endpoint === "model-latency") {
      return NextResponse.json({ range, data: computeAverageLatency(rows) });
    }

    if (endpoint === "requests") {
      const data = rows
        .sort((a, b) => {
          const left = a.created_at ? new Date(a.created_at).getTime() : 0;
          const right = b.created_at ? new Date(b.created_at).getTime() : 0;
          return right - left;
        })
        .slice(0, 20)
        .map<RequestRow>((row) => ({
          request_id: row.request_id ?? "",
          created_at: row.created_at ?? "",
          provider: row.provider ?? "unknown",
          model: row.model ?? "unknown",
          stop_reason: row.stop_reason ?? null,
          input_tokens: normalizeInputTokens(row),
          output_tokens: normalizeOutputTokens(row),
          total_cost_usd: normalizeCost(row),
        }));

      return NextResponse.json({ rows: data });
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load analytics" },
      { status: 500 }
    );
  }
}
