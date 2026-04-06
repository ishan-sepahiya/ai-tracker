# Signup Error Troubleshooting

If you're getting an error during signup, follow these steps to identify the exact problem.

## Step 1: Check Server Logs

1. **Look at your terminal where Next.js is running**
2. You should see detailed logs like:
   ```
   [createProfile] Starting for user: 930a335d-50b1-4b64-b9f0-4bc3478b139a
   [createProfile] Creating profile row...
   [ensureProfileRow] Upserting profile for user: 930a335d-50b1-4b64-b9f0-4bc3478b139a
   ```
3. **Find where the error message appears** - it will show which step is failing

## Step 2: Check Browser Console

1. **Open browser DevTools** (F12 or Cmd+Option+I)
2. Go to **Console** tab
3. Look for error messages starting with:
   - `[createProfile] Error:`
   - `[ensureProfileRow] Error:`
   - `[ensureTrialSubscriptionAndOwnerTeamMember] Error:`

## Common Errors & Fixes

### ❌ "Missing SUPABASE_SERVICE_ROLE_KEY"

**Cause:** Environment variable not set

**Fix:**
1. Go to Supabase dashboard → **Settings** → **API**
2. Copy the **Service Role** key (not the anon key)
3. Add to your `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
4. Restart your Next.js dev server: `npm run dev`

### ❌ "Trial plan not found in database"

**Cause:** The subscription_plans table doesn't have a 'trial' plan

**Fix:**
1. Go to Supabase SQL Editor
2. Run this query:
   ```sql
   -- Check if trial plan exists
   SELECT * FROM public.subscription_plans WHERE name = 'trial';
   
   -- If empty, insert it:
   INSERT INTO public.subscription_plans (name, max_seats, price_monthly_usd, features)
   VALUES ('trial', 1, 0, '{"features": ["basic_tracking", "daily_alerts"]}')
   ON CONFLICT (name) DO NOTHING;
   
   -- Verify it was created
   SELECT * FROM public.subscription_plans;
   ```

### ❌ "Failed to create profile: permission denied"

**Cause:** RLS policies are blocking the service role

**Fix:** Re-run the RLS policy update from the Resend setup guide, or:
1. Go to Supabase SQL Editor
2. Run:
   ```sql
   -- Drop and recreate profile policies with service role bypass
   DROP POLICY IF EXISTS "profile_insert" ON public.profiles;
   
   CREATE POLICY "profile_insert" ON public.profiles
   FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');
   ```

### ❌ "Failed to create subscription"

**Cause:** Missing RLS policy on subscriptions table

**Fix:**
1. Go to Supabase SQL Editor
2. Run:
   ```sql
   DROP POLICY IF EXISTS "subscriptions_user_access" ON public.subscriptions;
   
   CREATE POLICY "subscriptions_user_access" ON public.subscriptions
   FOR ALL USING (auth.uid() = owner_user_id OR auth.role() = 'service_role');
   ```

### ❌ "Failed to create team member"

**Cause:** Missing RLS policy on team_members table

**Fix:**
1. Go to Supabase SQL Editor
2. Run:
   ```sql
   DROP POLICY IF EXISTS "team_members_access" ON public.team_members;
   
   CREATE POLICY "team_members_access" ON public.team_members
   FOR ALL USING (auth.role() = 'service_role' OR auth.uid() = user_id);
   ```

## Verification Checklist

Before attempting signup again, verify:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- [ ] Trial plan exists: Run `SELECT COUNT(*) FROM public.subscription_plans WHERE name = 'trial';` → Should return `1`
- [ ] Service role can insert to profiles: 
  ```sql
  -- This should NOT raise an error
  SELECT * FROM public.profiles LIMIT 1;
  ```
- [ ] RLS policies exist on all tables:
  ```sql
  SELECT tablename, policyname FROM pg_policies 
  WHERE schemaname = 'public' 
  ORDER BY tablename;
  ```

## Test Signup Flow

1. **Open browser DevTools** (F12)
2. Go to **Console** tab
3. Try signing up with: 
   - Email: `test-signup@example.com`
   - Password: `TestPassword123!`
4. **Watch the console for logs** - you'll see exactly where it fails
5. Check your **terminal running Next.js** - server logs will show the full error

## Still Stuck?

If you've checked everything above, run this diagnostic query in Supabase SQL Editor:

```sql
-- Diagnostic Query
SELECT 
  'auth.users' as table_name,
  (SELECT COUNT(*) FROM auth.users) as record_count
UNION ALL
SELECT 'profiles', (SELECT COUNT(*) FROM public.profiles)
UNION ALL
SELECT 'subscription_plans', (SELECT COUNT(*) FROM public.subscription_plans)
UNION ALL
SELECT 'subscriptions', (SELECT COUNT(*) FROM public.subscriptions)
UNION ALL
SELECT 'team_members', (SELECT COUNT(*) FROM public.team_members);

-- Check RLS is working
SELECT tablename, rowsecurity FROM pg_class 
WHERE relname IN ('profiles', 'subscriptions', 'team_members')
ORDER BY relname;

-- Check policies
SELECT schemaname, tablename, policyname, rows
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

This will show you the current state of all tables and policies.
