export type ProviderRow = {
  id: string;
  user_id: string;
  provider_name: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_custom?: boolean | null;
  model_name?: string | null;
};

export type UsageRecordInsert = {
  user_id: string;
  provider_id: string;
  date: string;
  source?: "sdk" | "cron";
  total_cost_usd: number;
  total_tokens: number;
  request_count: number;
  raw_response: unknown;
};