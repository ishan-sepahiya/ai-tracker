#!/bin/sh
# cron.sh — runs inside a separate Fly Machine on a schedule
# Deploy this as a separate Fly cron machine, not part of the main app

# Fly.io Machines can be scheduled — set this up with:
# fly machine run . --schedule daily --env CRON_SECRET=your-secret

curl -s -X POST \
  "https://AiSpend.fly.dev/api/cron/fetch-usage" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  --max-time 60 \
  --retry 3

echo "Cron job completed at $(date)"
