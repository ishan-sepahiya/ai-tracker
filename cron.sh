#!/bin/sh
# cron.sh — runs on EC2 via system cron job (crontab)
# This is called daily at midnight by the EC2 cron daemon

curl -s -X POST \
  "http://localhost:3000/api/cron/fetch-usage" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  --max-time 60 \
  --retry 3

echo "Cron job completed at $(date)"
