-- 004_rls_policies.sql
-- Enable Row Level Security and create table policies.

-- ----------------------------
-- Enable RLS
-- ----------------------------
alter table profiles enable row level security;
alter table providers enable row level security;
alter table budgets enable row level security;
alter table usage_records enable row level security;
alter table alert_logs enable row level security;
alter table subscriptions enable row level security;
alter table team_members enable row level security;
alter table model_pricing enable row level security;
alter table subscription_plans enable row level security;

-- ----------------------------
-- profiles: own row only
-- ----------------------------
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own"
on profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own"
on profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Service role full access (backend jobs/routes).
drop policy if exists "profiles_service_role_all" on profiles;
create policy "profiles_service_role_all"
on profiles
for all
to service_role
using (true)
with check (true);

-- ----------------------------
-- providers: own rows only
-- ----------------------------
drop policy if exists "providers_select_own" on providers;
create policy "providers_select_own"
on providers
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "providers_insert_own" on providers;
create policy "providers_insert_own"
on providers
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "providers_update_own" on providers;
create policy "providers_update_own"
on providers
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "providers_delete_own" on providers;
create policy "providers_delete_own"
on providers
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "providers_service_role_all" on providers;
create policy "providers_service_role_all"
on providers
for all
to service_role
using (true)
with check (true);

-- ----------------------------
-- budgets: own rows only
-- ----------------------------
drop policy if exists "budgets_select_own" on budgets;
create policy "budgets_select_own"
on budgets
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "budgets_insert_own" on budgets;
create policy "budgets_insert_own"
on budgets
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "budgets_update_own" on budgets;
create policy "budgets_update_own"
on budgets
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "budgets_delete_own" on budgets;
create policy "budgets_delete_own"
on budgets
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "budgets_service_role_all" on budgets;
create policy "budgets_service_role_all"
on budgets
for all
to service_role
using (true)
with check (true);

-- ----------------------------
-- usage_records:
-- - SELECT own rows only
-- - INSERT/UPDATE service role only
-- ----------------------------
drop policy if exists "usage_records_select_own" on usage_records;
create policy "usage_records_select_own"
on usage_records
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "usage_records_insert_service_role" on usage_records;
create policy "usage_records_insert_service_role"
on usage_records
for insert
to service_role
with check (true);

drop policy if exists "usage_records_update_service_role" on usage_records;
create policy "usage_records_update_service_role"
on usage_records
for update
to service_role
using (true)
with check (true);

-- Optional: allow service role reads for backend processing.
drop policy if exists "usage_records_select_service_role" on usage_records;
create policy "usage_records_select_service_role"
on usage_records
for select
to service_role
using (true);

-- ----------------------------
-- alert_logs:
-- - SELECT own rows only
-- - INSERT service role only
-- ----------------------------
drop policy if exists "alert_logs_select_own" on alert_logs;
create policy "alert_logs_select_own"
on alert_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "alert_logs_insert_service_role" on alert_logs;
create policy "alert_logs_insert_service_role"
on alert_logs
for insert
to service_role
with check (true);

drop policy if exists "alert_logs_select_service_role" on alert_logs;
create policy "alert_logs_select_service_role"
on alert_logs
for select
to service_role
using (true);

-- ----------------------------
-- subscriptions:
-- - SELECT own subscription
-- - UPDATE service role only
-- ----------------------------
drop policy if exists "subscriptions_select_own" on subscriptions;
create policy "subscriptions_select_own"
on subscriptions
for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "subscriptions_update_service_role" on subscriptions;
create policy "subscriptions_update_service_role"
on subscriptions
for update
to service_role
using (true)
with check (true);

drop policy if exists "subscriptions_insert_service_role" on subscriptions;
create policy "subscriptions_insert_service_role"
on subscriptions
for insert
to service_role
with check (true);

drop policy if exists "subscriptions_select_service_role" on subscriptions;
create policy "subscriptions_select_service_role"
on subscriptions
for select
to service_role
using (true);

-- ----------------------------
-- team_members:
-- - SELECT if owner of subscription OR if own membership row
-- - INSERT/DELETE by subscription owner only
-- ----------------------------
drop policy if exists "team_members_select_owner_or_self" on team_members;
create policy "team_members_select_owner_or_self"
on team_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from subscriptions s
    where s.id = team_members.subscription_id
      and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "team_members_insert_owner_only" on team_members;
create policy "team_members_insert_owner_only"
on team_members
for insert
to authenticated
with check (
  exists (
    select 1
    from subscriptions s
    where s.id = team_members.subscription_id
      and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "team_members_delete_owner_only" on team_members;
create policy "team_members_delete_owner_only"
on team_members
for delete
to authenticated
using (
  exists (
    select 1
    from subscriptions s
    where s.id = team_members.subscription_id
      and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "team_members_service_role_all" on team_members;
create policy "team_members_service_role_all"
on team_members
for all
to service_role
using (true)
with check (true);

-- ----------------------------
-- model_pricing:
-- - SELECT for all authenticated users
-- - writes for service role only
-- ----------------------------
drop policy if exists "model_pricing_select_authenticated" on model_pricing;
create policy "model_pricing_select_authenticated"
on model_pricing
for select
to authenticated
using (true);

drop policy if exists "model_pricing_write_service_role" on model_pricing;
create policy "model_pricing_write_service_role"
on model_pricing
for all
to service_role
using (true)
with check (true);

-- ----------------------------
-- subscription_plans:
-- - SELECT for all authenticated users
-- - writes for service role only
-- ----------------------------
drop policy if exists "subscription_plans_select_authenticated" on subscription_plans;
create policy "subscription_plans_select_authenticated"
on subscription_plans
for select
to authenticated
using (true);

drop policy if exists "subscription_plans_write_service_role" on subscription_plans;
create policy "subscription_plans_write_service_role"
on subscription_plans
for all
to service_role
using (true)
with check (true);

