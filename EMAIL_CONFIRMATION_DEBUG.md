# Email Confirmation Not Redirecting - Debugging Guide

If you click the email confirmation link and see "Confirming your email..." but nothing happens, follow this guide.

## Quick Diagnostic

1. **Open browser DevTools** (F12)
2. Go to **Console** tab
3. Click the email confirmation link again
4. Watch the console for `[AuthCallback]` logs
5. **Copy all logs** and share them

### What Logs Should Show

✅ **Success:**
```
[AuthCallback] Handling callback, current URL: https://yoursite.com/auth/callback?token_hash=...
[AuthCallback] Session check: {hasSession: true, sessionError: null}
[AuthCallback] User authenticated: abc123 Email: user@example.com
[AuthCallback] Creating profile...
[AuthCallback] Profile created successfully
[AuthCallback] Redirecting to onboarding
```

❌ **Failure - No Session:**
```
[AuthCallback] Handling callback, current URL: https://yoursite.com/auth/callback?token_hash=...
[AuthCallback] Session check: {hasSession: false, sessionError: null}
[AuthCallback] Still no session, redirecting to login
```

❌ **Failure - Supabase Error:**
```
[AuthCallback] Session error: {"status": 400, "error": "..."}
```

---

## Step 1: Verify Callback URL in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Auth** → look for **URL Configuration** or **Redirect URLs**
4. Check if these are listed:
   - `http://localhost:3000/auth/callback`
   - `https://yourdomain.com/auth/callback` (if deployed)

**If not present:** Add them now!

---

## Step 2: Check Email Template

The confirmation email MUST include the callback URL.

1. Go to Supabase → **Settings** → **Auth** → **Email Templates**
2. Find the **Confirmation** email template
3. Verify it contains: `{{ .ConfirmationURL }}`
4. This should generate a URL like: `https://yoursite.com/auth/callback?token_hash=...&type=email_confirmation`

**If missing:** Contact Supabase support or regenerate the email template

---

## Step 3: Check if Email Confirmation is Enabled

1. Go to Supabase → **Settings** → **Auth**
2. Find **Confirm email** toggle
3. Make sure it's **ON**
4. Save if you made changes

---

## Step 4: Test with Console Commands

1. Open browser DevTools (F12) → **Console** tab
2. Run this to check current session:
```javascript
// Check if there's an active session
(async () => {
  const { data, error } = await supabase.auth.getSession();
  console.log('Current session:', data.session);
  console.log('Session error:', error);
})();
```

**Expected output:**
- If logged in: Your session object with user ID, email, etc.
- If not logged in: `null`

3. If session is `null` after clicking the link, run:
```javascript
// Try to refresh the session
(async () => {
  const { data, error } = await supabase.auth.refreshSession();
  console.log('After refresh:', data.session);
  console.log('Error:', error);
})();
```

---

## Step 5: Check Supabase Logs

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **Logs** (under "Developer Tools")
3. Try the email confirmation flow again
4. Look for auth errors or edge function errors
5. Copy any error messages

---

## Step 6: Common Issues & Fixes

### Issue: "No session found"

**Cause:** Token not being processed from URL

**Fix:**
1. Make sure callback URL is in Supabase redirect URLs
2. Make sure the email template includes `{{ .ConfirmationURL }}`
3. Try accessing the callback URL manually with the token from email:
   - Copy full URL from email confirmation link
   - Paste it in browser address bar
   - See if it processes

### Issue: Profile creation error (but session exists)

**Logs would show:**
```
[AuthCallback] User authenticated: abc123
[AuthCallback] Creating profile...
[AuthCallback] Profile creation error: permission denied
```

**Fix:**
1. Check RLS policies on profiles table (see AUTH_CALLBACK_SETUP.md)
2. Run this in Supabase SQL Editor:
```sql
-- Check if service role can insert profiles
SELECT COUNT(*) FROM public.profiles LIMIT 1;
```

### Issue: Redirect to onboarding doesn't work

**Logs would show:**
```
[AuthCallback] Redirecting to onboarding
```
But page doesn't change

**Fix:**
1. Check browser console for other errors
2. Try manually: `window.location.href = '/onboarding'`
3. This will confirm if the problem is Next.js routing or something else

---

## Step 7: Manual Test

If automatic confirmation isn't working:

1. **Create a user manually in Supabase:**
   - Go to Supabase → **Authentication** → **Users**
   - Click **Create user**
   - Enter email and password
   - Toggle **Auto Confirm User** to **ON**
   - Click **Save**

2. **Log in with that user:**
   - Go to http://localhost:3000/login (or your site)
   - Use the email and password you just created
   - Should redirect to onboarding ✅

If manual login works but email confirmation doesn't, the issue is with email processing, not the redirect.

---

## What to Do If Still Stuck

**Collect this info and let me know:**

1. **Logs:** Open DevTools (F12) → Console → Click email link → Copy all `[AuthCallback]` logs
2. **Screenshot:** Show me Supabase redirect URLs configuration
3. **Test:** Can you manually log in? (see Step 7)
4. **Error:** Any error messages in browser console

Then I can help diagnose the exact issue!

---

## Summary of Callback Flow

```
Email link clicked
      ↓
Browser goes to /auth/callback?token_hash=...
      ↓
Supabase SDK processes token
      ↓
Session created
      ↓
Profile created
      ↓
Redirect to /onboarding
      ↓
✅ Done
```

If it stops at any step, the logs will tell us where.
