import type { UsageRecordInsert } from "@/lib/types";

const ANTHROPIC_USAGE_URL = "https://api.anthropic.com/v1/usage";

type AnthropicUsageResponse = {
  // Anthropic's usage responses can vary; we keep it permissive and parse common fields.
  [key: string]: unknown;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function sumNumericFields(
  root: Record<string, unknown>,
  candidates: string[]
): number {
  let total = 0;
  for (const candidate of candidates) {
    if (root[candidate] != null) total += toNumber(root[candidate]);
  }
  return total;
}

export async function fetchAnthropicUsageRecord(params: {
  userId: string;
  providerId: string;
  date: string;
  apiKey: string;
}): Promise<UsageRecordInsert> {
  const response = await fetch(ANTHROPIC_USAGE_URL, {
    method: "GET",
    headers: {
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Anthropic usage fetch failed (${response.status}): ${
        errorText || "Unknown error"
      }`
    );
  }

  const usage = (await response.json()) as AnthropicUsageResponse;

  // Best-effort parsing; if Anthropic returns token/cost breakdowns,
  // we sum common fields. If not, we fall back to 0 and store raw_response.
  const root = usage as unknown as Record<string, unknown>;
  const totalTokens = sumNumericFields(root, [
    "input_tokens",
    "output_tokens",
    "tokens",
    "total_tokens",
  ]);
  const totalCostUsd = sumNumericFields(root, [
    "total_cost_usd",
    "cost_usd",
    "cost",
  ]);
  const requestCount = sumNumericFields(root, [
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
    raw_response: usage,
  };
}

