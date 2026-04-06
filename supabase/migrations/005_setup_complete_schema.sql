-- AI Tracker - CORRECTED Database Schema
-- Key fixes:
-- 1. model_pricing now has a proper primary key and is linked to usage_records
-- 2. usage_records references model_pricing instead of just storing model name
-- 3. All tables properly connected through foreign keys

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  api_token text UNIQUE,
  razorpay_customer_id text UNIQUE,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- 2. Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  max_seats integer NOT NULL,
  price_monthly_usd numeric NOT NULL DEFAULT 0,
  razorpay_plan_id text,
  features jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscription_plans_pkey PRIMARY KEY (id)
);

-- 3. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL UNIQUE,
  plan_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'trialing'::text CHECK (status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'cancelled'::text])),
  trial_ends_at timestamp with time zone NOT NULL DEFAULT (now() + '30 days'::interval),
  current_period_end timestamp with time zone,
  razorpay_subscription_id text UNIQUE,
  razorpay_customer_id text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE RESTRICT
);

-- 4. Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL,
  user_id uuid,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'member'::text])),
  invited_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'active'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_members_pkey PRIMARY KEY (id),
  CONSTRAINT team_members_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 5. Create budgets table
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_id text NOT NULL, -- 'aws', 'gcp', 'openai', 'anthropic'
  monthly_limit_usd numeric NOT NULL,
  alert_threshold_pct integer DEFAULT 80,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT budgets_pkey PRIMARY KEY (id),
  CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 6. Create providers table (user credentials for each cloud provider)
CREATE TABLE IF NOT EXISTS public.providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_name text NOT NULL, -- 'aws', 'gcp', 'openai', 'anthropic'
  display_name text,
  api_key_encrypted text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT providers_pkey PRIMARY KEY (id),
  CONSTRAINT providers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT providers_user_provider_unique UNIQUE(user_id, provider_name)
);

-- 7. Create model_pricing table (CORRECTED - now a proper reference table)
-- Drop and recreate to ensure correct schema if table already exists
DROP TABLE IF EXISTS public.model_pricing CASCADE;

CREATE TABLE public.model_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_name text NOT NULL, -- 'openai', 'anthropic', 'aws', 'gcp'
  model_name text NOT NULL, -- e.g., 'gpt-4', 'claude-3', 'bedrock-titan'
  input_cost_per_1k_tokens numeric NOT NULL, -- Cost per 1000 input tokens
  output_cost_per_1k_tokens numeric NOT NULL, -- Cost per 1000 output tokens
  effective_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT model_pricing_pkey PRIMARY KEY (id),
  CONSTRAINT model_pricing_unique UNIQUE (provider_name, model_name, effective_date)
);

-- 8. Create usage_records table (CORRECTED - now links to model_pricing)
-- Drop and recreate to ensure correct schema with model_pricing_id column
DROP TABLE IF EXISTS public.usage_records CASCADE;

CREATE TABLE public.usage_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  model_pricing_id uuid NOT NULL, -- NEW: Reference to model_pricing
  date date NOT NULL,
  total_cost_usd numeric NOT NULL,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  request_count integer,
  raw_response jsonb,
  fetched_at timestamp with time zone DEFAULT now(),
  source text DEFAULT 'cron'::text CHECK (source = ANY (ARRAY['cron'::text, 'sdk'::text])),
  request_id text,
  CONSTRAINT usage_records_pkey PRIMARY KEY (id),
  CONSTRAINT usage_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT usage_records_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE,
  CONSTRAINT usage_records_model_pricing_fkey FOREIGN KEY (model_pricing_id) REFERENCES public.model_pricing(id) ON DELETE RESTRICT
);

-- 9. Create alert_logs table
CREATE TABLE IF NOT EXISTS public.alert_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_type text NOT NULL CHECK (alert_type = ANY (ARRAY['budget_threshold'::text, 'daily_cost'::text, 'billing_cycle'::text])),
  message text,
  sent_at timestamp with time zone DEFAULT now(),
  month_year text NOT NULL,
  CONSTRAINT alert_logs_pkey PRIMARY KEY (id),
  CONSTRAINT alert_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);


-- ============================================
-- Enable Row Level Security (RLS)
-- ============================================

-- Enable RLS on profiles (with policies below to allow user access)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for plans and pricing (no user-specific restrictions)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_pricing ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- Profiles: Users can read/write their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Subscription plans: Public read access
DROP POLICY IF EXISTS "Public read subscription plans" ON public.subscription_plans;
CREATE POLICY "Public read subscription plans" ON public.subscription_plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manages subscription plans" ON public.subscription_plans;
CREATE POLICY "Service role manages subscription plans" ON public.subscription_plans
  FOR ALL USING (true) WITH CHECK (true);

-- Model pricing: Public read access (all users can see pricing)
DROP POLICY IF EXISTS "Public read model pricing" ON public.model_pricing;
CREATE POLICY "Public read model pricing" ON public.model_pricing
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manages model pricing" ON public.model_pricing;
CREATE POLICY "Service role manages model pricing" ON public.model_pricing
  FOR ALL USING (true) WITH CHECK (true);

-- Subscriptions: Users can view their own subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);

-- Team members: Users can manage their own team members
DROP POLICY IF EXISTS "Users can manage own team members" ON public.team_members;
CREATE POLICY "Users can manage own team members" ON public.team_members
  FOR ALL USING (
    subscription_id IN (
      SELECT id FROM public.subscriptions WHERE owner_user_id = auth.uid()
    )
  ) WITH CHECK (
    subscription_id IN (
      SELECT id FROM public.subscriptions WHERE owner_user_id = auth.uid()
    )
  );

-- Budgets: Users can view/edit their own budgets
DROP POLICY IF EXISTS "Users can view own budgets" ON public.budgets;
CREATE POLICY "Users can view own budgets" ON public.budgets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own budgets" ON public.budgets;
CREATE POLICY "Users can insert own budgets" ON public.budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own budgets" ON public.budgets;
CREATE POLICY "Users can update own budgets" ON public.budgets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Providers: Users can manage their own providers
DROP POLICY IF EXISTS "Users can manage own providers" ON public.providers;
CREATE POLICY "Users can manage own providers" ON public.providers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Usage records: Users can view their own usage, service role can insert new records
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_records;
CREATE POLICY "Users can view own usage" ON public.usage_records
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert usage" ON public.usage_records;
CREATE POLICY "Service role can insert usage" ON public.usage_records
  FOR INSERT WITH CHECK (true);

-- Alert logs: Users can view their own alerts, service role can insert new alerts
DROP POLICY IF EXISTS "Users can view own alert logs" ON public.alert_logs;
CREATE POLICY "Users can view own alert logs" ON public.alert_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert alert logs" ON public.alert_logs;
CREATE POLICY "Service role can insert alert logs" ON public.alert_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- Insert default subscription plans
-- ============================================

INSERT INTO public.subscription_plans (name, max_seats, price_monthly_usd, features)
VALUES
  ('trial', 1, 0, '{"features": ["basic_tracking", "daily_alerts"]}'),
  ('professional', 5, 49, '{"features": ["advanced_tracking", "forecasting", "team_management"]}'),
  ('enterprise', -1, 0, '{"features": ["all_features", "dedicated_support", "sso"]}')
ON CONFLICT (name) DO NOTHING;

-- Insert default model pricing
INSERT INTO public.model_pricing (provider_name, model_name, input_cost_per_1k_tokens, output_cost_per_1k_tokens)
VALUES
  ('openai', 'gpt-4', 0.03, 0.06),
  ('openai', 'gpt-4-turbo', 0.01, 0.03),
  ('openai', 'gpt-3.5-turbo', 0.0005, 0.0015),
  ('anthropic', 'claude-3-opus', 0.015, 0.075),
  ('anthropic', 'claude-3-sonnet', 0.003, 0.015),
  ('anthropic', 'claude-3-haiku', 0.00025, 0.00125),
  ('aws', 'bedrock-titan', 0.00025, 0.001),
  ('gcp', 'palm-2', 0.0001, 0.0001)
ON CONFLICT (provider_name, model_name, effective_date) DO NOTHING;

-- ============================================
-- Create indexes for better performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_owner ON public.subscriptions(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_subscription ON public.team_members(subscription_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_providers_user ON public.providers(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_user_date ON public.usage_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_records_user_provider ON public.usage_records(user_id, provider_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_model_pricing ON public.usage_records(model_pricing_id);
CREATE INDEX IF NOT EXISTS idx_alert_logs_user_month ON public.alert_logs(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_model_pricing_provider ON public.model_pricing(provider_name, model_name);