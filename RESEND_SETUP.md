# Resend Email Integration Setup

This guide will help you configure Resend as your email provider to replace Supabase's built-in email (which has rate limits).

## Step 1: Get Resend SMTP Credentials

Since you already have a Resend account and API key, you can use Resend's SMTP server:

1. Go to [https://resend.com/api-keys](https://resend.com/api-keys)
2. Your API key is already available as `RESEND_API_KEY`
3. For SMTP, you'll use:
   - **SMTP Host:** `smtp.resend.com`
   - **SMTP Port:** `465` (SSL) or `587` (TLS)
   - **SMTP Username:** `default` (literally the word "default")
   - **SMTP Password:** Your `RESEND_API_KEY`
   - **From Email:** The email address you verified in Resend (set in `RESEND_FROM_EMAIL` env var)

## Step 2: Configure Supabase to Use Resend SMTP

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Auth** → **Email**
3. Under **SMTP Settings**, click **Enable Custom SMTP**
4. Fill in the fields:
   - **SMTP Host:** `smtp.resend.com`
   - **SMTP Port:** `587`
   - **SMTP User:** `default`
   - **SMTP Password:** (Paste your `RESEND_API_KEY` here)
   - **Sender Email:** Your verified Resend email (e.g., `noreply@yourdomain.com` or `onboarding@yourdomain.com`)
   - **Sender Name:** `AI Tracker` (or your app name)

5. Click **Test Connection** to verify it works
6. Click **Save**

## Step 3: Verify Your Environment Variables

Make sure these are set in your `.env.local` or deployment environment:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Resend Email Configuration
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com  # or any verified email in Resend
```

## Step 4: Test Email Sending

1. Try signing up with a new email address
2. You should receive the confirmation email from Resend (not Supabase)
3. Check the Resend dashboard at [https://resend.com/emails](https://resend.com/emails) to see email logs

## Troubleshooting

### "Email rate exceeded" still appears

If you still see rate limit errors:

1. **Clear browser cache** - The old error might be cached
2. **Verify SMTP connection** - Go back to Supabase Auth settings and click **Test Connection** again
3. **Check Resend logs** - Visit [https://resend.com/emails](https://resend.com/emails) to see if emails are being sent

### Emails not being received

1. **Check sender email** - Make sure the `RESEND_FROM_EMAIL` matches a verified sender in Resend
2. **Verify domain** - If using a custom domain, ensure it's verified in Resend
3. **Check spam folder** - Resend emails might initially go to spam; add to contacts
4. **Review Resend dashboard** - Check [https://resend.com/emails](https://resend.com/emails) for bounce/failure logs

### SMTP connection fails

- Verify port is `587` (not 465)
- Verify SMTP user is literally `default` (not your email)
- Verify SMTP password is your actual `RESEND_API_KEY`
- Try connection again from Supabase settings

## Advanced: Custom Email Templates

The `lib/email.ts` file now includes custom email templates for:
- Email confirmation: `sendEmailConfirmation()`
- Password reset: `sendPasswordReset()`
- Team invitations: `sendTeamInvitation()`

These can be used for API endpoints if you want to send custom emails directly from your Next.js app.

## Rate Limits

With Resend:
- **Free plan:** 100 emails/day
- **Paid plan:** Customizable based on your plan

Much better than Supabase's built-in email limits!

## Next Steps

1. Complete steps 1-3 above
2. Test signup/login with your app
3. Verify emails arrive in your inbox
4. Monitor Resend dashboard for email metrics

