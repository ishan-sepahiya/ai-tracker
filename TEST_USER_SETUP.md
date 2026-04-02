# Test User Setup Guide

## Sample Test User Credentials

Use these credentials to test the application:

**Email:** `test@example.com`  
**Password:** `TestPassword123!`

## How to Create the Test User

### ⚠️ Known Issue: Database Error
The Supabase API is currently returning a database error when creating users programmatically. This needs to be resolved in your Supabase dashboard settings.

### Option 1: Via Supabase Dashboard (Recommended - Workaround)

1. Go to your Supabase project: https://app.supabase.com
2. Log in with your Supabase account
3. Navigate to **Authentication** → **Users**
4. Click the **"Invite"** button
5. Enter email: `test@example.com`
6. Click **Send invite**
7. Check the email inbox (or check Supabase email logs if using test mode)
8. Follow the confirmation link
9. Set password to: `TestPassword123!`
10. Confirm and you're done!

### Option 2: Direct SQL Insert (Admin Access)

If you have direct database access via Supabase SQL Editor:

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New Query**
3. Use this query:

```sql
-- Create user in auth.users table
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
ON CONFLICT DO NOTHING
RETURNING id;
```

4. Copy the returned `id`
5. Run this second query to create the profile:

```sql
-- Create user profile
INSERT INTO public.profiles (id, email, full_name)
VALUES ('PASTE_ID_HERE', 'test@example.com', 'Test User')
ON CONFLICT DO NOTHING;
```

### Option 3: Contact Supabase Support

Since the API is throwing a database error, Supabase support may need to:
- Check your project's database configuration
- Reset authentication tables if corrupted
- Re-enable auth user creation functionality

## Login Instructions

Once the test user is created:

1. Go to http://localhost:3000/login
2. Enter: 
   - Email: `test@example.com`
   - Password: `TestPassword123!`
3. Click **Sign in**
4. You'll be redirected to onboarding
5. Complete onboarding to access the dashboard

## Pricing Tier Updates

✅ **Trial Tier Updated**
- No longer says "Forever free"
- Now displays "1 month free"
- Button text: "Start Trial"

✅ **Professional Tier Updated**  
- Removed "1 month free trial" messaging
- Now displays "Billed monthly"
- Button text: "Subscribe Now" (not "Start Free Trial")
- Users must pay immediately - no trial period

## Troubleshooting

### Issue: "Database error creating new user"
- This is a Supabase backend issue
- Use Option 2 (SQL Insert) as a workaround
- Contact Supabase support if SQL method also fails

### Issue: Can't receive invitation email
- Check your Supabase email configuration
- If in development, check Supabase email logs
- Consider adding test@example.com to allowed test emails

### Issue: Can't log in after creating user
- Ensure email is confirmed (`email_confirmed_at` is set)
- Verify profile exists in `public.profiles` table
- Check if user role is set to 'authenticated'
