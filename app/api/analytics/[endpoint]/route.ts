
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProviderRelation = {
  provider_name: string;
};

type ModelPricingRelation = {
  model_name: string;
};

type UsageRow = {
  date: string;
  total_cost_usd: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  request_count: number | null;
  request_id: string | null;
  fetched_at: string | null;
  stop_reason: string | null;
  providers: ProviderRelation | ProviderRelation[] | null;
  model_pricing: ModelPricingRelation | ModelPricingRelation[] | null;
};

type NormalizedUsage = {
  date: string;
  provider: string;
  model: string;
  stop_reason: string | null;
  total_cost_usd: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  request_count: number;
  request_id: string | null;
  fetched_at: string | null;
};

function getRelation<T>(relation: T | T[] | null): T | null {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation)
    ? relation[0] ?? null
    : relation;
}

async function fetchUsageRows(
  userId: string,
  startDate: string,
  endDate: string
): Promise<UsageRow[]> {
  const { data, error } = await supabaseAdmin
    .from("usage_records")
    .select(`
      date,
      total_cost_usd,
      prompt_tokens,
      completion_tokens,
      total_tokens,
      request_count,
      request_id,
      fetched_at,
      stop_reason,
      providers!inner (
        provider_name
      ),
      model_pricing!inner (
        model_name
      )
    `)
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) {
    console.error("Failed to fetch usage records:", error);
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as UsageRow[];
}

function normalizeRows(rows: UsageRow[]): NormalizedUsage[] {
  return rows.map((row) => {
    const provider = getRelation(row.providers);
    const modelPricing = getRelation(row.model_pricing);

    const inputTokens = Number(row.prompt_tokens ?? 0);
    const outputTokens = Number(row.completion_tokens ?? 0);

    const totalTokens =
      row.total_tokens !== null && row.total_tokens !== undefined
        ? Number(row.total_tokens)
        : inputTokens + outputTokens;

    return {
      date: row.date,

      provider: provider?.provider_name ?? "Unknown",

      model: modelPricing?.model_name ?? "Unknown",

      stop_reason: row.stop_reason,

      total_cost_usd: Number(row.total_cost_usd ?? 0),

      total_tokens: totalTokens,

      input_tokens: inputTokens,

      output_tokens: outputTokens,

      request_count: Number(row.request_count ?? 0),

      request_id: row.request_id,

      fetched_at: row.fetched_at,
    };
  });
}

function getDateRange(range: string) {
  const end = new Date();
  const start = new Date(end);

  switch (range) {
    case "24h":
      start.setHours(start.getHours() - 24);
      break;

    case "7d":
      start.setDate(start.getDate() - 7);
      break;

    case "30d":
    default:
      start.setDate(start.getDate() - 30);
      break;
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function getSummary(rows: NormalizedUsage[]) {
  return {
    totalCost: rows.reduce(
      (sum, row) => sum + row.total_cost_usd,
      0
    ),

    totalTokens: rows.reduce(
      (sum, row) => sum + row.total_tokens,
      0
    ),

    inputTokens: rows.reduce(
      (sum, row) => sum + row.input_tokens,
      0
    ),

    outputTokens: rows.reduce(
      (sum, row) => sum + row.output_tokens,
      0
    ),

    requests: rows.reduce(
      (sum, row) => sum + row.request_count,
      0
    ),
  };
}

function getProviderBreakdown(rows: NormalizedUsage[]) {
  const groups = new Map<string, NormalizedUsage[]>();

  for (const row of rows) {
    const existing = groups.get(row.provider) ?? [];
    existing.push(row);
    groups.set(row.provider, existing);
  }

  return Array.from(groups.entries())
    .map(([provider, items]) => ({
      provider,

      cost: items.reduce(
        (sum, row) => sum + row.total_cost_usd,
        0
      ),

      tokens: items.reduce(
        (sum, row) => sum + row.total_tokens,
        0
      ),

      requests: items.reduce(
        (sum, row) => sum + row.request_count,
        0
      ),
    }))
    .sort((a, b) => b.cost - a.cost);
}

function getModelBreakdown(rows: NormalizedUsage[]) {
  const groups = new Map<string, NormalizedUsage[]>();

  for (const row of rows) {
    const existing = groups.get(row.model) ?? [];
    existing.push(row);
    groups.set(row.model, existing);
  }

  return Array.from(groups.entries())
    .map(([model, items]) => ({
      model,

      cost: items.reduce(
        (sum, row) => sum + row.total_cost_usd,
        0
      ),

      tokens: items.reduce(
        (sum, row) => sum + row.total_tokens,
        0
      ),

      requests: items.reduce(
        (sum, row) => sum + row.request_count,
        0
      ),
    }))
    .sort((a, b) => b.cost - a.cost);
}

function getTimeSeries(rows: NormalizedUsage[]) {
  const groups = new Map<string, NormalizedUsage[]>();

  for (const row of rows) {
    const existing = groups.get(row.date) ?? [];
    existing.push(row);
    groups.set(row.date, existing);
  }

  return Array.from(groups.entries())
    .map(([date, items]) => ({
      date,

      cost: items.reduce(
        (sum, row) => sum + row.total_cost_usd,
        0
      ),

      tokens: items.reduce(
        (sum, row) => sum + row.total_tokens,
        0
      ),

      requests: items.reduce(
        (sum, row) => sum + row.request_count,
        0
      ),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getStopReasons(rows: NormalizedUsage[]) {
  const groups = new Map<string, number>();

  for (const row of rows) {
    const reason = row.stop_reason ?? "unknown";

    groups.set(
      reason,
      (groups.get(reason) ?? 0) + row.request_count
    );
  }

  return Array.from(groups.entries())
    .map(([reason, requests]) => ({
      reason,
      requests,
    }))
    .sort((a, b) => b.requests - a.requests);
}

function getRecentRequests(rows: NormalizedUsage[]) {
  return [...rows]
    .sort((a, b) => {
      const aTime = a.fetched_at
        ? new Date(a.fetched_at).getTime()
        : 0;

      const bTime = b.fetched_at
        ? new Date(b.fetched_at).getTime()
        : 0;

      return bTime - aTime;
    })
    .slice(0, 100);
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      endpoint: string;
    }>;
  }
) {
  try {
    const { endpoint } = await params;

    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("userId");

    const range = searchParams.get("range") ?? "30d";

    if (!userId) {
      return NextResponse.json(
        {
          error: "userId is required",
        },
        {
          status: 400,
        }
      );
    }

    const { startDate, endDate } = getDateRange(range);

    const rawRows = await fetchUsageRows(
      userId,
      startDate,
      endDate
    );

    const rows = normalizeRows(rawRows);

    switch (endpoint) {
      case "summary":
        return NextResponse.json(
          getSummary(rows)
        );

      case "timeseries":
        return NextResponse.json(
          getTimeSeries(rows)
        );

      case "providers":
        return NextResponse.json(
          getProviderBreakdown(rows)
        );

      case "models":
        return NextResponse.json(
          getModelBreakdown(rows)
        );

      case "stop-reasons":
        return NextResponse.json(
          getStopReasons(rows)
        );

      case "requests":
        return NextResponse.json(
          getRecentRequests(rows)
        );

      default:
        return NextResponse.json(
          {
            error: `Unknown analytics endpoint: ${endpoint}`,
          },
          {
            status: 404,
          }
        );
    }
  } catch (error) {
    console.error("Analytics API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load analytics",
      },
      {
        status: 500,
      }
    );
  }
}