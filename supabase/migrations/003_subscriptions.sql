-- Subscription system (plans, subscriptions, team members) + pricing catalog
-- Also extends existing schema:
--   - usage_records.source (sdk|cron, default cron)
--   - profiles.api_token for SDK auth
--
-- NOTE: Replace the REPLACE_ME_* stripe price placeholders with your Stripe dashboard Price IDs.

create extension if not exists pgcrypto;

-- ----------------------------
-- subscription_plans
-- ----------------------------
create table if not exists subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  max_seats int not null check (max_seats >= 0),
  price_monthly_usd numeric not null check (price_monthly_usd >= 0),
  stripe_price_id text,
  features jsonb not null default '{}'::jsonb
);

-- seed plans
insert into subscription_plans (name, max_seats, price_monthly_usd, stripe_price_id, features)
values
  ('trial', 1, 0, null, '{"all": true}'::jsonb),
  ('starter', 5, 29, 'REPLACE_ME_STARTER_STRIPE_PRICE_ID', '{"all": true}'::jsonb),
  ('growth', 10, 79, 'REPLACE_ME_GROWTH_STRIPE_PRICE_ID', '{"all": true}'::jsonb)
on conflict (name) do nothing;

-- ----------------------------
-- subscriptions
-- ----------------------------
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid not null references subscription_plans(id) on delete restrict,
  status text not null check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stripe_subscription_id text,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id)
);

-- ----------------------------
-- team_members
-- ----------------------------
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  invited_email text,
  status text not null check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  unique (subscription_id, user_id)
);

-- ----------------------------
-- model_pricing
-- ----------------------------
create table if not exists model_pricing (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null,
  model text not null,
  input_rate_per_1k numeric not null check (input_rate_per_1k >= 0),
  output_rate_per_1k numeric not null check (output_rate_per_1k >= 0),
  effective_date date not null default current_date,
  updated_at timestamptz not null default now(),
  unique (provider_name, model, effective_date)
);

insert into model_pricing (provider_name, model, input_rate_per_1k, output_rate_per_1k, effective_date)
values
  ('openai', 'gpt-4o', 0.005, 0.015, current_date),
  ('openai', 'gpt-4-turbo', 0.01, 0.03, current_date),
  ('openai', 'gpt-3.5-turbo', 0.0005, 0.0015, current_date),
  ('anthropic', 'claude-3-5-sonnet-20241022', 0.003, 0.015, current_date),
  ('anthropic', 'claude-3-haiku', 0.00025, 0.00125, current_date),
  ('aws', 'amazon.titan-text-express-v1', 0.0008, 0.0016, current_date),
  ('gcp', 'gemini-1.5-pro', 0.00125, 0.005, current_date),
  ('gcp', 'gemini-1.5-flash', 0.000075, 0.0003, current_date)
on conflict (provider_name, model, effective_date) do nothing;

-- ----------------------------
-- Updated timestamps helper
-- ----------------------------
create or replace function set_updated_at_now()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_subscription_plans_updated_at on subscription_plans;
create trigger trg_subscription_plans_updated_at
before update on subscription_plans
for each row execute procedure set_updated_at_now();

drop trigger if exists trg_subscriptions_updated_at on subscriptions;
create trigger trg_subscriptions_updated_at
before update on subscriptions
for each row execute procedure set_updated_at_now();

drop trigger if exists trg_model_pricing_updated_at on model_pricing;
create trigger trg_model_pricing_updated_at
before update on model_pricing
for each row execute procedure set_updated_at_now();

-- ----------------------------
-- schema extensions
-- ----------------------------
alter table usage_records
  add column if not exists source text not null default 'cron'
  check (source in ('sdk', 'cron'));

alter table profiles
  add column if not exists api_token text;

update profiles
set api_token = gen_random_uuid()::text
where api_token is null;

alter table profiles
  alter column api_token set not null;

alter table profiles
  add unique (api_token);

-- ----------------------------
-- Backfill trial subscriptions + owners for existing users
-- (so middleware can immediately rely on subscription status)
-- ----------------------------
insert into subscriptions (owner_user_id, plan_id, status, trial_ends_at, current_period_end)
select
  p.id,
  sp.id,
  'trialing',
  now() + interval '30 days',
  now() + interval '30 days'
from profiles p
join subscription_plans sp on sp.name = 'trial'
where not exists (
  select 1 from subscriptions s where s.owner_user_id = p.id
);

insert into team_members (subscription_id, user_id, role, invited_email, status)
select
  s.id,
  s.owner_user_id,
  'owner',
  null,
  'active'
from subscriptions s
join subscription_plans sp on sp.id = s.plan_id and sp.name = 'trial'
where not exists (
  select 1
  from team_members tm
  where tm.subscription_id = s.id and tm.user_id = s.owner_user_id
);

