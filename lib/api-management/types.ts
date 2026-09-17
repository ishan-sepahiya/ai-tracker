export type Organization = {
  id: string;
  name: string;
  subscription_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Department = {
  id: string;
  organization_id: string;
  name: string;
  created_at: string | null;
  updated_at: string | null;
};

export type Project = {
  id: string;
  department_id: string;
  name: string;
  created_at: string | null;
  updated_at: string | null;
};

export type Environment = {
  id: string;
  project_id: string;
  name: string;
  created_at: string | null;
};

export type ApiKey = {
  id: string;
  user_id: string;
  project_id: string | null;
  environment_id: string | null;
  name: string | null;
  key_hash: string;
  last_used: string | null;
  expires_at: string | null;
  created_at: string | null;
  revoked: boolean;
  daily_budget: number | null;
};

export type ProviderCredential = {
  id: string;
  project_id: string;
  environment_id: string | null;
  provider_name: string;
  display_name: string | null;
  secret_ref: string;
  status: string;
  created_by: string | null;
  rotated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};