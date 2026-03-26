import type { UsageRecordInsert } from "@/lib/types";

const OPENAI_USAGE_URL = "https://api.openai.com/v1/usage";

type OpenAIUsageResponse = {
  data?: Array<Record<string, unknown>>;
  results?: Array<Record<string, unknown>>;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function sumFields(
  rows: Array<Record<string, unknown>>,
  candidates: string[]
): number {
  return rows.reduce((sum, row) => {
    const field = candidates.find((candidate) => row[candidate] != null);
    return sum + toNumber(field ? row[field] : 0);
  }, 0);
}

export async function fetchOpenAIUsageForDate(date: string, apiKey: string) {
  const response = await fetch(`${OPENAI_USAGE_URL}?date=${date}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI usage fetch failed (${response.status}): ${errorText || "Unknown error"}`
    );
  }

  return (await response.json()) as OpenAIUsageResponse;
}

function mapOpenAIUsageToUsageRecord(params: {
  userId: string;
  providerId: string;
  date: string;
  usage: OpenAIUsageResponse;
}): UsageRecordInsert {
  const rows = params.usage.data ?? params.usage.results ?? [];

  const totalTokens = sumFields(rows, [
    "total_tokens",
    "tokens",
    "input_tokens",
    "output_tokens",
  ]);
  const totalCostUsd = sumFields(rows, ["total_cost_usd", "cost_usd", "cost"]);
  const requestCount = sumFields(rows, [
    "request_count",
    "requests",
    "num_requests",
  ]);

  return {
    user_id: params.userId,
    provider_id: params.providerId,
    date: params.date,
    total_cost_usd: totalCostUsd,
    total_tokens: totalTokens,
    request_count: requestCount,
    raw_response: params.usage,
  };
}

export async function fetchOpenAIUsageRecord(params: {
  userId: string;
  providerId: string;
  date: string;
  apiKey: string;
}): Promise<UsageRecordInsert> {
  const usage = await fetchOpenAIUsageForDate(params.date, params.apiKey);
  return mapOpenAIUsageToUsageRecord({
    userId: params.userId,
    providerId: params.providerId,
    date: params.date,
    usage,
  });
}
