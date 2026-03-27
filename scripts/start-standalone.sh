#!/usr/bin/env bash
set -euo pipefail

# Load environment variables for production runtime.
# PM2 does NOT automatically load .env.local.
if [[ -f ".env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.local"
  set +a
fi

# Ensure Next standalone binds correctly.
export NODE_ENV="${NODE_ENV:-production}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"

exec node .next/standalone/server.js

