-- ============================================
-- 1. Profiles table (FIXED: no auth.users FK)
-- ============================================

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  api_token text UNIQUE,
  razorpay_customer_id text UNIQUE,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- ============================================
-- AUTO CREATE PROFILE ON SIGNUP (IMPORTANT)
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. Subscription Plans
-- ============================================

CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  max_seats integer NOT NULL,
  price_monthly_usd numeric NOT NULL DEFAULT 0,
  razorpay_plan_id text,
  features jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 3. Subscriptions
-- ============================================

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid UNIQUE NOT NULL,
  plan_id uuid NOT NULL,
  status text DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','cancelled')),
  trial_ends_at timestamptz DEFAULT (now() + interval '30 days'),
  current_period_end timestamptz,
  razorpay_subscription_id text UNIQUE,
  razorpay_customer_id text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id)
);

-- ============================================
-- 4. Team Members
-- ============================================

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL,
  user_id uuid,
  role text DEFAULT 'member' CHECK (role IN ('owner','member')),
  invited_email text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','active')),
  created_at timestamptz DEFAULT now(),

  FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ============================================
-- 5. Budgets
-- ============================================

CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_id text NOT NULL,
  monthly_limit_usd numeric NOT NULL,
  alert_threshold_pct integer DEFAULT 80,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ============================================
-- 6. Providers
-- ============================================

CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_name text NOT NULL,
  display_name text,
  api_key_encrypted text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, provider_name),
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ============================================
-- 7. Model Pricing
-- ============================================

CREATE TABLE public.model_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  model_name text NOT NULL,
  input_cost_per_1k_tokens numeric NOT NULL,
  output_cost_per_1k_tokens numeric NOT NULL,
  effective_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(provider_name, model_name, effective_date)
);

-- ============================================
-- 8. Usage Records
-- ============================================

CREATE TABLE public.usage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  model_pricing_id uuid NOT NULL,
  date date NOT NULL,
  total_cost_usd numeric NOT NULL,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  request_count integer,
  raw_response jsonb,
  fetched_at timestamptz DEFAULT now(),
  source text DEFAULT 'cron' CHECK (source IN ('cron','sdk')),
  request_id text,

  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE,
  FOREIGN KEY (model_pricing_id) REFERENCES public.model_pricing(id)
);

-- ============================================
-- 9. Alert Logs
-- ============================================

CREATE TABLE public.alert_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_type text CHECK (alert_type IN ('budget_threshold','daily_cost','billing_cycle')),
  message text,
  sent_at timestamptz DEFAULT now(),
  month_year text NOT NULL,

  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- RLS Policies for multi-tenancy (users can only see their own data)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_pricing ENABLE ROW LEVEL SECURITY;

-- Core Policies
-- Profiles
CREATE POLICY "profile_select" ON public.profiles
FOR SELECT USING (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "profile_insert" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "profile_update" ON public.profiles
FOR UPDATE USING (auth.uid() = id OR auth.role() = 'service_role');

-- Public read
CREATE POLICY "plans_read" ON public.subscription_plans
FOR SELECT USING (true);

CREATE POLICY "plans_insert_service" ON public.subscription_plans
FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "plans_update_service" ON public.subscription_plans
FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "pricing_read" ON public.model_pricing
FOR SELECT USING (true);

CREATE POLICY "pricing_insert_service" ON public.model_pricing
FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "pricing_update_service" ON public.model_pricing
FOR UPDATE USING (auth.role() = 'service_role');

-- Subscriptions (user + service role access)
CREATE POLICY "subscriptions_user_access" ON public.subscriptions
FOR ALL USING (auth.uid() = owner_user_id OR auth.role() = 'service_role');

-- Team members (user + service role access)  
CREATE POLICY "team_members_access" ON public.team_members
FOR ALL USING (auth.role() = 'service_role' OR auth.uid() = user_id);

-- User-owned tables
CREATE POLICY "user_data_access" ON public.providers
FOR ALL USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "usage_access" ON public.usage_records
FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "budget_access" ON public.budgets
FOR ALL USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "alerts_access" ON public.alert_logs
FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');