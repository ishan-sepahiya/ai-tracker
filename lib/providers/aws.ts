import type { UsageRecordInsert } from "@/lib/types";

import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from "@aws-sdk/client-cost-explorer";

function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * AWS Cost Explorer is cost-centric; it does not reliably provide token counts.
 * This adapter returns token/request counts as 0 (best-effort) while capturing raw_response.
 *
 * Expected apiKey shape (JSON string):
 * {
 *   "accessKeyId": "...",
 *   "secretAccessKey": "...",
 *   "sessionToken"?: "...",
 *   "region"?: "us-east-1"
 * }
 */
export async function fetchAwsUsageRecord(params: {
  userId: string;
  providerId: string;
  date: string;
  apiKey: string;
}): Promise<UsageRecordInsert> {
  try {
    const parsed = JSON.parse(params.apiKey) as {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
      region?: string;
    };

    const client = new CostExplorerClient({
      region: parsed.region ?? "us-east-1",
      credentials: {
        accessKeyId: parsed.accessKeyId,
        secretAccessKey: parsed.secretAccessKey,
        sessionToken: parsed.sessionToken,
      },
    });

    // Filter to Amazon Bedrock service.
    const start = params.date;
    const end = addDays(params.date, 1);

    const cmd = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: start,
        End: end,
      },
      Granularity: "DAILY",
      Metrics: ["UnblendedCost"],
      Filter: {
        Dimensions: {
          Key: "SERVICE",
          Values: ["Amazon Bedrock"],
        },
      },
    });

    const resp = await client.send(cmd);

    const resultsByTime = resp.ResultsByTime ?? [];
    const totalCostUsd = toNumber(
      resultsByTime?.[0]?.Total?.UnblendedCost?.Amount ?? 0
    );

    return {
      user_id: params.userId,
      provider_id: params.providerId,
      date: params.date,
      total_cost_usd: totalCostUsd,
      total_tokens: 0,
      request_count: 0,
      raw_response: resp,
    };
  } catch (err) {
    return {
      user_id: params.userId,
      provider_id: params.providerId,
      date: params.date,
      total_cost_usd: 0,
      total_tokens: 0,
      request_count: 0,
      raw_response: {
        error: err instanceof Error ? err.message : "Unknown error",
      },
    };
  }
}

