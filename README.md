# AI Tracker - EC2 Deployment Guide

This project is deployed on EC2 using:
- Next.js standalone build
- Docker container
- Nginx reverse proxy + rate limiting
- PM2 process management
- Certbot SSL

## 1) Required Environment Variables

Copy `.env.local.example` to `.env.local` and fill in values:

```bash
cp .env.local.example .env.local
```

Required keys:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
API_KEY_ENCRYPTION_SECRET=
CRON_SECRET=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

On EC2, place this file at `/opt/ai-tracker/.env.local`.

## 2) One-Time EC2 Bootstrap

Run the installer with required variables:

```bash
chmod +x install.sh
DOMAIN=yourdomain.com \
GIT_REPO_URL=https://github.com/your-org/ai-tracker.git \
GIT_BRANCH=main \
CRON_SECRET=your_cron_secret \
./install.sh
```

What `install.sh` does:
- Installs Node 20, Docker, Nginx, PM2, certbot
- Clones or updates the repo in `/opt/ai-tracker`
- Builds Docker image from `Dockerfile`
- Runs container through PM2
- Configures Nginx using `nginx.conf`
- Requests SSL certificate with certbot
- Adds midnight cron job for `/api/cron/fetch-usage`

## 3) Build/Run Locally (Optional)

```bash
npm ci
npm run build
npm run start
```

Docker local run:

```bash
docker build -t ai-tracker:latest .
docker run --rm -p 3000:3000 --env-file .env.local ai-tracker:latest
```

## 4) Supabase Migrations

Apply migrations in order:
- `003_subscriptions.sql`
- `004_rls_policies.sql`

Use Supabase SQL editor or Supabase CLI:

```bash
supabase db push
```

If using SQL editor, execute files in `supabase/migrations` in numeric order.

## 5) Stripe Webhook Setup

In Stripe Dashboard:
1. Go to Developers -> Webhooks
2. Add endpoint:
   - `https://yourdomain.com/api/stripe/webhook`
3. Subscribe to relevant events (example):
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy signing secret into:
   - `STRIPE_WEBHOOK_SECRET`

Also set:
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## 6) Test Cron Manually

From EC2:

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/fetch-usage
```

Expected JSON contains:
- `processed`
- `succeeded`
- `failed`
- `alerts_sent`

## 7) Deployment Pipeline Summary

- Next config uses `output: 'standalone'`
- Multi-stage Docker build outputs standalone server
- Nginx proxies `:80` to app on `127.0.0.1:3000`
- `/api/sdk/usage` is rate-limited to `100 req/min/IP`
- PM2 keeps the Docker app running across reboots
