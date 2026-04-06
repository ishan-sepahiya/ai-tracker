# Temporary Debug Logs Reference

This document tracks all temporary console logs added to the codebase for debugging the signup flow. These can be removed once the signup issue is resolved.

## Log Locations & Details

### 1. **lib/actions/auth.ts** - `createProfile()` function

**Logs:**
```
[createProfile] Starting for user: {userId}
[createProfile] Creating profile row...
[createProfile] Profile row created successfully
[createProfile] Creating trial subscription...
[createProfile] Trial subscription created successfully
[createProfile] Error: {error}
```

**Purpose:** Tracks the overall profile creation flow

**Remove:** Delete lines with `console.log()` and `console.error()` calls

---

### 2. **lib/auth/server.ts** - `ensureProfileRow()` function

**Logs:**
```
[ensureProfileRow] Upserting profile for user: {userId} email: {email}
[ensureProfileRow] Database error: {error}
[ensureProfileRow] Success
[ensureProfileRow] Caught error: {error}
```

**Purpose:** Tracks profile insertion into Supabase

**Database Operations:**
- Upserts profile row with id, email, full_name
- Shows RLS or database permission errors

**Remove:** Delete all `console.log()` and `console.error()` calls

---

### 3. **lib/actions/subscriptions.ts** - `ensureTrialSubscriptionAndOwnerTeamMember()` function

**Logs:**
```
[ensureTrialSubscriptionAndOwnerTeamMember] Starting for user: {userId}
[ensureTrialSubscriptionAndOwnerTeamMember] Fetching trial plan...
[ensureTrialSubscriptionAndOwnerTeamMember] Plan fetch error: {error}
[ensureTrialSubscriptionAndOwnerTeamMember] Trial plan not found in database
[ensureTrialSubscriptionAndOwnerTeamMember] Trial plan found: {planId}
[ensureTrialSubscriptionAndOwnerTeamMember] Checking for existing subscription...
[ensureTrialSubscriptionAndOwnerTeamMember] Subscription fetch error: {error}
[ensureTrialSubscriptionAndOwnerTeamMember] Using existing subscription: {subId}
[ensureTrialSubscriptionAndOwnerTeamMember] Creating new subscription...
[ensureTrialSubscriptionAndOwnerTeamMember] Subscription creation error: {error}
[ensureTrialSubscriptionAndOwnerTeamMember] New subscription created: {subId}
[ensureTrialSubscriptionAndOwnerTeamMember] Checking for existing owner team member...
[ensureTrialSubscriptionAndOwnerTeamMember] Team member fetch error: {error}
[ensureTrialSubscriptionAndOwnerTeamMember] Owner team member already exists
[ensureTrialSubscriptionAndOwnerTeamMember] Creating owner team member...
[ensureTrialSubscriptionAndOwnerTeamMember] Team member creation error: {error}
[ensureTrialSubscriptionAndOwnerTeamMember] Owner team member created successfully
[ensureTrialSubscriptionAndOwnerTeamMember] Caught error: {error}
```

**Purpose:** Tracks trial subscription and team member creation flow

**Database Operations:**
1. Fetches trial plan from subscription_plans table
2. Checks for existing subscriptions
3. Creates new subscription if needed
4. Creates owner team member record

**Remove:** Delete all `console.log()` and `console.error()` calls

---

### 4. **app/(auth)/signup/page.tsx** - `onSubmit()` function

**Logs:**
```
Profile creation error: {message}
Signup error: {message}
```

**Purpose:** Client-side error logging for UI error display

**Remove:** Delete the `console.error()` calls (keep the `setError()` calls for UI)

---

## How to Use These Logs for Debugging

### Step 1: Reproduce the Error
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Try signing up with a test email
4. Watch the console in real-time

### Step 2: Check Terminal Output
1. Look at your terminal running `npm run dev`
2. Scroll up to see the server-side logs
3. Find the sequence of logs to identify where it fails

### Step 3: Match the Error to Troubleshooting Guide
Use the log sequence to find the exact failure point in [SIGNUP_TROUBLESHOOTING.md](SIGNUP_TROUBLESHOOTING.md)

**Example Log Sequence:**
```
[createProfile] Starting for user: abc123
[createProfile] Creating profile row...
[ensureProfileRow] Upserting profile for user: abc123 email: test@example.com
[ensureProfileRow] Database error: permission denied for relation profiles
[ensureProfileRow] Caught error: Failed to create profile: permission denied for relation profiles
[createProfile] Error: Error: Failed to create profile: permission denied for relation profiles
```
↓
**Issue:** RLS policy blocks profile insert → Fix in troubleshooting guide under "permission denied"

---

## Cleanup Instructions

Once signup is working and you want to remove these logs:

### Option 1: Remove Individual Logs
1. Open each file listed above
2. Delete lines containing `console.log()` or `console.error()`
3. Keep the actual business logic intact

### Option 2: Use a Script (if many logs to remove)
```bash
# This will show all lines with console.log in the affected files
grep -n "console\." \
  lib/actions/auth.ts \
  lib/auth/server.ts \
  lib/actions/subscriptions.ts \
  app/\(auth\)/signup/page.tsx

# Then manually delete each one
```

### Option 3: Commit without logs
If you want to keep this file for reference but remove logs:
1. Remove all `console.log()` and `console.error()` statements
2. Commit with message: "Remove debug logs from signup flow"
3. Keep this markdown file as documentation

---

## Files Modified with Logs

| File | Log Count | Severity |
|------|-----------|----------|
| `lib/actions/auth.ts` | 5 | Low (wrapper function) |
| `lib/auth/server.ts` | 4 | Medium (database operation) |
| `lib/actions/subscriptions.ts` | 19 | High (complex multi-step) |
| `app/(auth)/signup/page.tsx` | 2 | Low (client-side UI) |

**Total Logs Added:** ~30 console statements

---

## Example: Full Error Trace

**Scenario:** User tries to signup but gets permission denied

**Console Output:**
```
[createProfile] Starting for user: 930a335d-50b1-4b64-b9f0-4bc3478b139a
[createProfile] Creating profile row...
[ensureProfileRow] Upserting profile for user: 930a335d-50b1-4b64-b9f0-4bc3478b139a email: test@example.com
[ensureProfileRow] Database error: {
  code: '42501',
  message: 'permission denied for relation profiles',
  details: 'RLS policy denies access'
}
[ensureProfileRow] Caught error: Error: Failed to create profile: permission denied for relation profiles
[createProfile] Error: Error: Failed to create profile: permission denied for relation profiles
Signup error: Failed to create profile: permission denied for relation profiles
```

**UI Shows:** "Profile creation failed: permission denied for relation profiles"

**Next Step:** Go to SIGNUP_TROUBLESHOOTING.md → Find "Failed to create profile: permission denied" → Apply fix

---

## Important Notes

- ⚠️ These logs will **appear in production** if left in
- 📝 Keep this file safe - it documents exactly what was added
- 🔍 Logs use `[FunctionName]` prefix for easy grep searching
- 🗑️ Consider these **temporary** - remove after fixing signup
- 📊 Server logs appear in terminal; client logs appear in browser console

## Quick Grep Commands

Find all debug logs:
```bash
grep -r "\[createProfile\]\|\[ensureProfileRow\]\|\[ensureTrialSubscriptionAndOwnerTeamMember\]" .
```

Find all console statements in modified files:
```bash
grep -n "console\." lib/actions/auth.ts lib/auth/server.ts lib/actions/subscriptions.ts app/\(auth\)/signup/page.tsx
```

---

## Status: Active Logs

**Current Status:** ✅ ACTIVE - Use for debugging

When signup is working:
- [ ] Verify signup completes without errors
- [ ] Check browser console shows no errors
- [ ] Test with multiple email addresses
- [ ] Remove all console statements
- [ ] Update this file status to "REMOVED"
- [ ] Commit and push to main

---
