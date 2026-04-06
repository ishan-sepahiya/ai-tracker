# Test User Setup Guide

## ⚠️ CRITICAL: Setup Database Schema First

**If you're seeing "Database error querying schema" when logging in, you MUST run the schema setup SQL first.**

### Step 1: Create Database Schema

1. Go to your Supabase project: https://app.supabase.com
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire content from: `supabase/migrations/005_setup_complete_schema.sql`
5. Click **Run** (or press Ctrl+Enter)
6. Wait for completion - you should see "All done! Your database is now properly configured."

**This SQL script creates:**
- ✅ All required tables (profiles, subscriptions, plans, budgets, etc.)
- ✅ Row Level Security (RLS) policies
- ✅ Default subscription plans (Trial, Professional, Enterprise)
- ✅ Default providers (OpenAI, Anthropic, AWS, GCP)
- ✅ Performance indexes

**Without this step, signup and login will fail with database errors.**

---

## Sample Test User Credentials

Use these credentials to test the application:

**Email:** `test@example.com`  
**Password:** `TestPassword123!`

## How to Create the Test User

### Option 1: Admin SQL Insert (Fastest - Requires Admin Access)

Since you have admin access, you can create a complete test user in one query:

1. Go to your Supabase project: https://app.supabase.com
2. Click **SQL Editor** → **New Query**
3. Copy and paste this SQL:

```sql
-- Create user, profile, and subscription in one go
DO $$
DECLARE
  user_id uuid;
  plan_id uuid;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id, 
    aud,
    role,
    email,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'test@example.com',
    now(),
    '{"sub": "test-user"}'::jsonb,
    now(),
    now()
  )
  RETURNING id INTO user_id;

  -- Create user profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (user_id, 'test@example.com', 'Test User')
  ON CONFLICT DO NOTHING;

  -- Get trial plan ID
  SELECT id INTO plan_id FROM public.subscription_plans WHERE name = 'trial' LIMIT 1;

  -- Create trial subscription
  INSERT INTO public.subscriptions (
    owner_user_id,
    plan_id,
    status,
    trial_ends_at,
    current_period_end
  )
  VALUES (
    user_id,
    plan_id,
    'trialing',
    now() + interval '30 days',
    now() + interval '30 days'
  )
  ON CONFLICT DO NOTHING;

  -- Create team member (owner)
  INSERT INTO public.team_members (
    subscription_id,
    user_id,
    role,
    invited_email,
    status
  )
  SELECT 
    s.id,
    user_id,
    'owner',
    'test@example.com',
    'active'
  FROM public.subscriptions s
  WHERE s.owner_user_id = user_id
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Test user created: test@example.com (ID: %)', user_id;
END $$;
```

4. Click **Run**
5. You should see: `Test user created: test@example.com (ID: <uuid>)`
6. **Password Setup:** Go to **Authentication** → **Users** → find the test@example.com user → click **Reset Password** → set password to: `TestPassword123!`
7. User is now ready to log in!

### Option 2: Via Supabase Dashboard (Easy but Slower)

1. Go to **Authentication** → **Users**
2. Click the **"Create user"** button (or **"Invite"**)
3. Enter email: `test@example.com`
4. Enter password: `TestPassword123!`
5. Toggle **Auto Confirm User** to ON
6. Click **Save**
7. Navigate to your app and log in with the credentials

### Option 3: Direct SQL Insert (Alternate Admin Method)

If the PL/pgSQL method above doesn't work:

1. Go to **SQL Editor** → **New Query**
2. Run this to create the auth user:

```sql
INSERT INTO auth.users (
  instance_id,
  id, 
  aud,
  role,
  email,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  now(),
  now(),
  now()
)
RETURNING id;
```

3. Copy the returned `id`
4. Go to **Authentication** → **Users** → find test@example.com → click **Reset Password** → set password to: `TestPassword123!`
5. Run this to create the profile:

```sql
INSERT INTO public.profiles (id, email, full_name)
VALUES ('PASTE_ID_HERE', 'test@example.com', 'Test User')
ON CONFLICT DO NOTHING;
```

5. Run this to create the subscription:

```sql
INSERT INTO public.subscriptions (
  owner_user_id,
  plan_id,
  status,
  trial_ends_at,
  current_period_end
)
SELECT 
  p.id,
  sp.id,
  'trialing',
  now() + interval '30 days',
  now() + interval '30 days'
FROM public.profiles p
CROSS JOIN public.subscription_plans sp
WHERE p.email = 'test@example.com'
  AND sp.name = 'trial'
ON CONFLICT DO NOTHING;
```

6. Run this to create the team member:

```sql
INSERT INTO public.team_members (
  subscription_id,
  user_id,
  role,
  invited_email,
  status
)
SELECT 
  s.id,
  s.owner_user_id,
  'owner',
  'test@example.com',
  'active'
FROM public.subscriptions s
WHERE s.owner_user_id = (SELECT id FROM public.profiles WHERE email = 'test@example.com')
ON CONFLICT DO NOTHING;
```

## Login Instructions

After database schema is set up and test user is created:

1. Go to http://localhost:3000/login (or your deployed URL)
2. Enter: 
   - Email: `test@example.com`
   - Password: `TestPassword123!`
3. Click **Sign in**
4. You'll be redirected to onboarding
5. Complete onboarding to access the dashboard

## Enable New User Signups

For other users to create accounts:

1. Ensure the schema SQL has been run (Step 1 above)
2. Users can visit `/signup` to create new accounts
3. The system will automatically:
   - Create their profile
   - Set them up with a Trial plan (1 month free)
   - Create their team member record

**Note:** All users start with the Trial plan automatically.

## Pricing Tier Updates

✅ **Trial Tier**
- $0/month
- Displays "1 month free"
- Button text: "Start Trial"
- Auto-assigned to all new users

✅ **Professional Tier**  
- $49/month
- Displays "Billed monthly"
- Button text: "Subscribe Now"
- Users must pay - no free trial

## Troubleshooting

### 🔴 CRITICAL: "Database error saving new user" or Can't Create Users in Supabase

**This means RLS policies are blocking user creation.** The auth.users table or public tables have RLS enabled with incorrect policies.

#### Emergency Fix (Do This First):

1. Go to Supabase SQL Editor → **New Query**
2. Run this to disable RLS on all tables and fix the issue:

```sql
-- Disable RLS temporarily on all tables to allow user creation
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_providers DISABLE ROW LEVEL SECURITY;
```

3. Click **Run**
4. Now try creating a user - it should work!

#### If that fixes it, Re-enable RLS Properly:

1. Go to SQL Editor → **New Query**
2. Run the full schema setup again from `supabase/migrations/005_setup_complete_schema.sql`
3. This will re-create all tables WITH the correct RLS policies

#### Verify RLS is Fixed:

```sql
-- Check which tables have RLS enabled
SELECT tablename, rowsecurity 
FROM pg_class 
WHERE relname IN ('users', 'profiles', 'subscriptions', 'subscription_plans')
  AND schemaname = 'public';

-- Check all RLS policies
SELECT schemaname, tablename, policyname, permissive 
FROM pg_policies 
WHERE schemaname IN ('auth', 'public')
ORDER BY schemaname, tablename;
```

**Expected result after full schema setup:**
- `auth.users` should have RLS **disabled**
- Public tables should have RLS **enabled** with proper policies
- You should see many policies for each table (select, insert, update, etc.)

#### After RLS Fix - Complete These Steps:

Once you've disabled RLS (you should see "Success. No rows returned"):

**Step 1: Create a test user**

Run this in SQL Editor:

```sql
-- Create test user now that RLS is disabled
INSERT INTO auth.users (
  instance_id,
  id, 
  aud,
  role,
  email,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  now(),
  now(),
  now()
)
RETURNING id;
```

**If you get error: "duplicate key value violates unique constraint"**

This means the user already exists from a previous attempt. That's fine! Skip to **Step 2** below - the user already exists.

**If you get a UUID returned:**

Good! The user was created. Continue to **Step 2**.

You should see a UUID returned. Copy it - you may need it.

**Step 2: Set the password**

Do this regardless of whether you created a new user or it already existed:

1. Go to **Authentication** → **Users** in Supabase
2. Find `test@example.com`
3. Click **Reset Password** button (top right of user row)
4. Set password to: `TestPassword123!`
5. Click **Save**

**Step 3: Create profile, subscription, and team member**

Run these 3 queries (one at a time):

```sql
-- Create profile
INSERT INTO public.profiles (id, email, full_name)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'test@example.com' LIMIT 1),
  'test@example.com',
  'Test User'
)
ON CONFLICT DO NOTHING;
```

```sql
-- Create subscription with trial plan
INSERT INTO public.subscriptions (owner_user_id, plan_id, status, trial_ends_at, current_period_end)
SELECT
  u.id,
  sp.id,
  'trialing',
  now() + interval '30 days',
  now() + interval '30 days'
FROM auth.users u
CROSS JOIN public.subscription_plans sp
WHERE u.email = 'test@example.com'
  AND sp.name = 'trial'
ON CONFLICT DO NOTHING;
```

```sql
-- Create team member
INSERT INTO public.team_members (subscription_id, user_id, role, invited_email, status)
SELECT
  s.id,
  s.owner_user_id,
  'owner',
  'test@example.com',
  'active'
FROM public.subscriptions s
WHERE s.owner_user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com')
ON CONFLICT DO NOTHING;
```

**Step 4: Test login**

1. Go to `http://localhost:3000/login` (or your deployed URL)
2. Enter:
   - Email: `test@example.com`
   - Password: `TestPassword123!`
3. Click **Sign in**
4. Should redirect to onboarding or dashboard

**Step 5: Re-enable RLS with correct policies**

After confirming login works, run the full schema setup to restore proper RLS:

1. Go to SQL Editor → **New Query**
2. Copy entire content from: `supabase/migrations/005_setup_complete_schema.sql`
3. Click **Run**
4. Should see: "All done! Your database is now properly configured."

This will re-create all RLS policies correctly while keeping your user.

---

## Troubleshooting (Original)

## Issue: "Database error querying schema" on Login/Signup

This error means the database tables don't exist or can't be accessed. **You MUST run Step 1 first.**

### Verify Your Schema is Set Up

Before creating test users or trying to sign up, verify the database schema exists:

1. Go to Supabase SQL Editor → **New Query**
2. Run this diagnostic query:

```sql
-- Check if all required tables exist
SELECT 
  'subscription_plans' as table_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans') as exists
UNION ALL
SELECT 'subscriptions', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions')
UNION ALL
SELECT 'profiles', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')
UNION ALL
SELECT 'team_members', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members')
UNION ALL
SELECT 'budgets', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets');

-- Also check subscription_plans has data
SELECT COUNT(*) as trial_plans FROM public.subscription_plans WHERE name = 'trial';
```

**Expected result:** All `exists` values should be `true`, and trial_plans should be `1` or higher.

**If any table shows `false`:** You haven't run the schema setup yet. Go back to Step 1 and run `005_setup_complete_schema.sql`.

**If tables exist but trial_plans is `0`:** The schema was created but default data wasn't inserted. Run this:

```sql
INSERT INTO public.subscription_plans (name, max_seats, price_monthly_usd, features)
VALUES
  ('trial', 1, 0, '{"features": ["basic_tracking", "daily_alerts"]}'),
  ('professional', 5, 49, '{"features": ["advanced_tracking", "forecasting", "team_management"]}'),
  ('enterprise', -1, 0, '{"features": ["all_features", "dedicated_support", "sso"]}')
ON CONFLICT (name) DO NOTHING;
```

---

## Issue: "Database error querying schema" on Login/Signup (Alternative)

This error means the database tables don't exist or can't be accessed. **You MUST run Step 1 first.**

### Verify Your Schema is Set Up

Before creating test users or trying to sign up, verify the database schema exists:

1. Go to Supabase SQL Editor → **New Query**
2. Run this diagnostic query:

```sql
-- Check if all required tables exist
SELECT 
  'subscription_plans' as table_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans') as exists
UNION ALL
SELECT 'subscriptions', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions')
UNION ALL
SELECT 'profiles', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')
UNION ALL
SELECT 'team_members', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members')
UNION ALL
SELECT 'budgets', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets');

-- Also check subscription_plans has data
SELECT COUNT(*) as trial_plans FROM public.subscription_plans WHERE name = 'trial';
```

**Expected result:** All `exists` values should be `true`, and trial_plans should be `1` or higher.

**If any table shows `false`:** You haven't run the schema setup yet. Go back to Step 1 and run `005_setup_complete_schema.sql`.

**If tables exist but trial_plans is `0`:** The schema was created but default data wasn't inserted. Run this:

```sql
INSERT INTO public.subscription_plans (name, max_seats, price_monthly_usd, features)
VALUES
  ('trial', 1, 0, '{"features": ["basic_tracking", "daily_alerts"]}'),
  ('professional', 5, 49, '{"features": ["advanced_tracking", "forecasting", "team_management"]}'),
  ('enterprise', -1, 0, '{"features": ["all_features", "dedicated_support", "sso"]}')
ON CONFLICT (name) DO NOTHING;
```

### Issue: Complete Database Reset (Delete Everything and Start Fresh)

If your database is corrupted or not working properly, you can completely delete all tables and recreate them:

#### Step 1: Delete All Tables (in correct order)

1. Go to Supabase SQL Editor → **New Query**
2. Run this to drop all tables AND delete all auth users:

```sql
-- Delete all auth users first
DELETE FROM auth.users;

-- Drop all tables in the correct order (respecting foreign keys)
DROP TABLE IF EXISTS public.alert_logs CASCADE;
DROP TABLE IF EXISTS public.usage_records CASCADE;
DROP TABLE IF EXISTS public.user_providers CASCADE;
DROP TABLE IF EXISTS public.model_pricing CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.providers CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Verify all tables are gone
SELECT * FROM information_schema.tables WHERE table_schema = 'public';

-- Verify no users exist
SELECT COUNT(*) as user_count FROM auth.users;
```

3. Click **Run**
4. You should see an empty result set (no tables)

#### Step 2: Recreate the Schema Fresh

1. Click **New Query**
2. Copy and paste the entire content from: `supabase/migrations/005_setup_complete_schema.sql`
3. Click **Run**
4. Wait for completion - you should see "All done! Your database is now properly configured."

#### Step 3: Create Test User (Optional)

Run the Option 1 test user creation query if you want a test user for testing.

**That's it!** Your database is now fresh and working properly.

---

### Issue: "Failed to create user: Database error creating new user" on Signup

This error occurs when the signup flow can't create a profile or subscription. **Most common cause: subscription_plans table is empty or missing.**

#### Debug & Fix Steps:

**Step 1: Check if schema is set up**

Run this in Supabase SQL Editor:

```sql
-- Check what tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

**Results guide:**
- If you see: `alert_logs, budgets, model_pricing, profiles, providers, subscriptions, subscription_plans, team_members, usage_records, user_providers` → Schema exists
- If fewer tables or none → Run full schema setup from `005_setup_complete_schema.sql`

**Step 2: Check if subscription_plans has data**

```sql
-- Check subscription plans
SELECT id, name, max_seats, price_monthly_usd FROM public.subscription_plans;
```

**Results guide:**
- If empty → Run the insert plans query below
- If has 3 rows (trial, professional, enterprise) → Move to Step 3

**If subscription_plans is empty, run this:**

```sql
INSERT INTO public.subscription_plans (name, max_seats, price_monthly_usd, features)
VALUES
  ('trial', 1, 0, '{"features": ["basic_tracking", "daily_alerts"]}'),
  ('professional', 5, 49, '{"features": ["advanced_tracking", "forecasting", "team_management"]}'),
  ('enterprise', -1, 0, '{"features": ["all_features", "dedicated_support", "sso"]}')
ON CONFLICT (name) DO NOTHING;
```

**Step 3: Check RLS policies**

```sql
-- Check if RLS policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Results guide:**
- If many policies listed → RLS is configured
- If no results → RLS policies weren't created (schema may have failed partway through)

**If RLS policies are missing**, run the full schema setup again: `005_setup_complete_schema.sql`

**Step 4: Try signing up again**

Now try creating a new account at `/signup`:
- Email: anything@example.com
- Password: TestPassword123! (or any password 8+ chars)
- Click "Create account"

**If signup still fails:**

1. Verify all steps 1-3 passed
2. Check Supabase logs for detailed error: Go to **Logs** in Supabase dashboard
3. If still stuck, do a complete database reset (see "Complete Database Reset" section below)

---

### Issue: Can't receive invitation email
- Check your Supabase email configuration
- If in development, check Supabase email logs
- Use Option 2 (SQL Insert) instead

### Issue: Can't log in after creating user
- Verify schema SQL was run (all tables should exist)
- Ensure email is confirmed (`email_confirmed_at` is set)
- Verify profile exists: `SELECT * FROM public.profiles WHERE email = 'test@example.com'`
- Check subscription was created: `SELECT * FROM public.subscriptions WHERE owner_user_id = (SELECT id FROM public.profiles WHERE email = 'test@example.com')`

### Issue: Signup still shows database errors
- Run the schema SQL again - it's idempotent (safe to run multiple times)
- Check that all tables were created: Go to **Table Editor** and verify you see all tables
- If tables are missing, something failed silently - run the SQL again
