#!/usr/bin/env bash
# Manual app startup test
# Run this to test if the app can start manually

cd /home/ubuntu/ai-tracker || cd /opt/ai-traker || { echo "❌ App directory not found"; exit 1; }

echo "Starting app manually for testing..."
echo "Press Ctrl+C to stop"
echo ""

# Set production environment
export NODE_ENV=production
export PORT=3001  # Use different port for testing

# Load environment variables
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
else
  echo "❌ .env.local not found!"
  exit 1
fi

# Try to start the app
if [ -f ".next/standalone/server.js" ]; then
  echo "✓ Using standalone build"
  node .next/standalone/server.js
else
  echo "ℹ Standalone build not found, trying npm start"
  npm start
fi
