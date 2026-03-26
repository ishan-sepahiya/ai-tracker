export type ProviderRow = {
  id: string;
  user_id: string;
  provider_name: string;
  display_name: string | null;
  api_key_encrypted: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
