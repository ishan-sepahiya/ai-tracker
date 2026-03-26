import type { UsageRecordInsert } from "@/lib/types";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * GCP Cloud Billing does not provide a simple, direct per-day token breakdown
 * via a single authenticated REST call. In practice, detailed cost-by-service
 * is typically obtained via Billing export to BigQuery and queried there.
 *
 * Expected apiKey shape (JSON string) for a best-effort adapter:
 * {
 *   "vertexAiCostUsd"?: number,
 *   "totalTokens"?: number,
 *   "requestCount"?: number
 * }
 *
 * Until Razorpay/Billing and/or BigQuery-backed reporting is integrated, we
 * return zeros and include guidance in raw_response when the fields are absent.
 */
export async function fetchGcpUsageRecord(params: {
  userId: string;
  providerId: string;
  date: string;
  apiKey: string;
}): Promise<UsageRecordInsert> {
  try {
    const parsed = JSON.parse(params.apiKey) as {
      vertexAiCostUsd?: number | string;
      totalTokens?: number | string;
      requestCount?: number | string;
    };

    return {
      user_id: params.userId,
      provider_id: params.providerId,
      date: params.date,
      total_cost_usd: toNumber(parsed.vertexAiCostUsd ?? 0),
      total_tokens: toNumber(parsed.totalTokens ?? 0),
      request_count: toNumber(parsed.requestCount ?? 0),
      raw_response: parsed,
    };
  } catch {
    return {
      user_id: params.userId,
      provider_id: params.providerId,
      date: params.date,
      total_cost_usd: 0,
      total_tokens: 0,
      request_count: 0,
      raw_response: {
        error:
          "GCP usage adapter expects apiKey to be JSON with precomputed vertexAiCostUsd/totalTokens/requestCount (BigQuery export recommended for real token/cost breakdown).",
      },
    };
  }
}

