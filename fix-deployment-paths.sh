#!/usr/bin/env bash
# Path mismatch fix script
# Run this on your EC2 server to fix the deployment paths

echo "Checking deployment paths..."
echo ""

# Check which path exists
if [ -d "/opt/ai-traker" ]; then
  echo "✓ Found app at /opt/ai-traker"
  ACTUAL_PATH="/opt/ai-traker"
elif [ -d "/home/ubuntu/ai-tracker" ]; then
  echo "✓ Found app at /home/ubuntu/ai-tracker"
  ACTUAL_PATH="/home/ubuntu/ai-tracker"
else
  echo "❌ Cannot find app directory!"
  echo "   Checked: /opt/ai-traker"
  echo "   Checked: /home/ubuntu/ai-tracker"
  exit 1
fi

echo ""
echo "Stopping PM2 processes..."
pm2 delete ai-traker >/dev/null 2>&1 || true
pm2 kill || true
sleep 2

echo ""
echo "Creating new PM2 config for: $ACTUAL_PATH"

# Create ecosystem config that matches actual path
cat > "$ACTUAL_PATH/ecosystem.config.cjs" <<EOF
module.exports = {
  apps: [
    {
      name: "ai-traker",
      cwd: "$ACTUAL_PATH",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
        PORT: "3000",
      },
      autorestart: true,
      max_memory_restart: "500M",
      max_restarts: 10,
      min_uptime: "10s",
      error_file: "$ACTUAL_PATH/pm2-error.log",
      out_file: "$ACTUAL_PATH/pm2-out.log",
    },
  ],
};
EOF

echo "✓ Created ecosystem.config.cjs at $ACTUAL_PATH"
echo ""

echo "Verifying .env.local exists..."
if [ ! -f "$ACTUAL_PATH/.env.local" ]; then
  echo "❌ .env.local not found at $ACTUAL_PATH/.env.local"
  echo "   Please create it with required environment variables"
  exit 1
fi
echo "✓ .env.local exists"

echo ""
echo "Building app..."
cd "$ACTUAL_PATH"
npm ci 2>&1 | tail -5
npm run build 2>&1 | tail -5

echo ""
echo "Starting PM2..."
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo ""
echo "Checking process status..."
sleep 3
pm2 status

echo ""
echo "Viewing recent logs..."
pm2 logs ai-traker --lines 20 --nostream

echo ""
echo "========================================="
echo "Deployment fix complete!"
echo "========================================="
