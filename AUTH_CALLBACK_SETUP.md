# Auto-Login After Email Confirmation Setup

This guide configures Supabase to automatically log users in after they confirm their email.

## Step 1: Update Supabase Auth Settings

1. Go to your **Supabase Dashboard** → [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Auth** (or **Authentication** → **URL Configuration**)
4. Find **Redirect URLs** section
5. Add these URLs:
   ```
   http://localhost:3000/auth/callback
   https://yourdomain.com/auth/callback
   ```

## Step 2: Supabase Email Settings

Make sure email confirmation is enabled:

1. Go to **Settings** → **Auth** → **Email**
2. Under **Confirm email**, toggle it **ON**
3. The confirmation email will include a link that redirects to `/auth/callback`
4. Note the email template - it should say "Confirm your email" with a button/link

## How It Works

### Current Flow:
1. User signs up → Auth user created
2. Confirmation email sent with link to `/auth/callback`
3. User clicks email link
4. Browser redirects to `/auth/callback?token_hash=xxx&type=email_confirmation&...`
5. Supabase SDK automatically processes the token from URL
6. User is logged in
7. `/auth/callback` page creates profile + redirects to onboarding
8. User lands on onboarding page ✅

### What Changed

**Before:**
- Email confirmation link went to `/` or unclear redirect
- Profile wasn't created until login
- User had to manually log in

**After:**
- Email confirmation link goes to `/auth/callback`
- Auto-creates profile after email confirmation
- User auto-logs in and goes directly to onboarding
- Seamless signup experience

## Testing

### Test 1: Full Signup Flow
1. Go to http://localhost:3000/signup
2. Sign up with test email: `test-full@example.com`
3. Check email for confirmation link
4. Click confirmation link
5. Should auto-login and show onboarding page

### Test 2: Email Already Confirmed
1. Go to http://localhost:3000/login
2. Log in with email: `isepahiya@gmail.com` (already confirmed user)
3. Should create profile (if missing) and redirect to onboarding

### Test 3: Wrong Password
1. Go to http://localhost:3000/login
2. Enter correct email but wrong password
3. Should show error: "Invalid login credentials"

## Troubleshooting

### Auto-login not working after email confirmation

1. **Check Supabase Redirect URLs:**
   - Go to Supabase → **Settings** → **Auth**
   - Verify `/auth/callback` is in the redirect URLs list
   - Make sure your domain is added (not localhost if in production)

2. **Check Email Template:**
   - Go to Supabase → **Settings** → **Auth** → **Email Templates**
   - Verify the confirmation email template has the correct redirect URL
   - Should contain: `{{ .ConfirmationURL }}` which includes `/auth/callback`

3. **Test in Browser Console:**
   ```javascript
   // Check if callback is working
   window.location.href  // Should be something like /auth/callback?...
   ```

4. **Check Browser Console Logs:**
   - Open DevTools (F12)
   - Look for `[AuthCallback]` logs
   - Should see:
     ```
     [AuthCallback] Handling callback
     [AuthCallback] User authenticated: abc123...
     [AuthCallback] Profile created successfully
     [AuthCallback] Redirecting to onboarding
     ```

### Login not working

**Error: "Invalid login credentials"**
- Verify email is confirmed in Supabase (check Users table)
- Verify password is correct
- Try resetting password via "Forgot?" link

**Error: "User not found"**
- User might not be created yet
- Try signing up first

**Nothing happens after clicking login**
- Check browser console (F12) for `[Login]` logs
- Check if there are network errors
- Verify Supabase credentials in `.env.local`

## Environment Variables

Make sure these are set in `.env.local` (for development):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

And in production (deployment), add the same variables to your hosting platform's environment variables.

## Files Changed

- Created: `app/(auth)/callback/page.tsx` - Handles auto-login after email confirmation
- Updated: `app/(auth)/login/page.tsx` - Better error logging for login
- Updated: `app/(onboarding)/page.tsx` - Creates profile on mount
- Updated: `app/dashboard/page.tsx` - Ensures profile exists

## Next Steps

1. Add `/auth/callback` to Supabase redirect URLs (Step 1 above)
2. Test the full signup → email confirmation → auto-login flow
3. Test login with existing users
4. Deploy to production and add production domain to redirect URLs

## Configuration Checklist

- [ ] Added `http://localhost:3000/auth/callback` to Supabase redirect URLs
- [ ] Added production domain `/auth/callback` to Supabase redirect URLs (if applicable)
- [ ] Email confirmation is enabled in Supabase Auth settings
- [ ] Tested signup flow
- [ ] Tested login flow
- [ ] Tested auto-login after email confirmation

---

**Status:** ✅ Ready for testing

Test it now by signing up and clicking the confirmation email link!
