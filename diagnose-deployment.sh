#!/usr/bin/env bash
# Deployment diagnostic script
# Run this on your EC2 server to identify issues

echo "========================================="
echo "AI Tracker Deployment Diagnostics"
echo "========================================="
echo ""

# Check Node version
echo "1. Node.js Version:"
node --version
echo ""

# Check PM2 status
echo "2. PM2 Process Status:"
pm2 status || echo "❌ PM2 not found"
echo ""

# Check PM2 logs for ai-traker
echo "3. PM2 Logs (last 30 lines):"
pm2 logs ai-traker --lines 30 --nostream 2>/dev/null || echo "❌ PM2 logs unavailable"
echo ""

# Check if port 3000 is listening
echo "4. Port 3000 Status:"
netstat -tuln | grep 3000 || echo "❌ Port 3000 not listening"
lsof -i :3000 2>/dev/null || echo "❌ lsof not available or port not in use"
echo ""

# Check Docker status (if using Docker)
echo "5. Docker Status:"
docker ps -a | grep ai-traker || echo "❌ No Docker container found"
echo ""

# Check Nginx status
echo "6. Nginx Status:"
sudo systemctl status nginx 2>/dev/null | head -5 || echo "❌ Nginx status check failed"
echo ""

# Check Nginx config
echo "7. Nginx Configuration Test:"
sudo nginx -t 2>&1
echo ""

# Check if .env.local exists
echo "8. Environment File Check:"
if [ -f "/home/ubuntu/ai-tracker/.env.local" ]; then
  echo "✓ .env.local found at /home/ubuntu/ai-tracker/.env.local"
  echo "Variables set:"
  grep "^[A-Z]" /home/ubuntu/ai-tracker/.env.local | cut -d= -f1
elif [ -f "/opt/ai-traker/.env.local" ]; then
  echo "✓ .env.local found at /opt/ai-traker/.env.local"
  echo "Variables set:"
  grep "^[A-Z]" /opt/ai-traker/.env.local | cut -d= -f1
else
  echo "❌ .env.local NOT FOUND"
fi
echo ""

# Test localhost connection
echo "9. Local Connection Test:"
curl -s http://127.0.0.1:3000 | head -20 || echo "❌ Cannot connect to http://127.0.0.1:3000"
echo ""

# Check DNS resolution
echo "10. DNS Resolution:"
nslookup aispen.site 2>/dev/null || echo "❌ DNS lookup failed"
echo ""

# Check app directory
echo "11. App Directory Contents:"
ls -la /home/ubuntu/ai-tracker/.next/standalone/server.js 2>/dev/null && echo "✓ Standalone build found" || echo "❌ Standalone build NOT found"
ls -la /opt/ai-traker/.next/standalone/server.js 2>/dev/null && echo "✓ Standalone build found" || echo "❌ Standalone build NOT found"
echo ""

# Check package.json scripts
echo "12. NPM Scripts Available:"
grep -A 5 '"scripts"' /home/ubuntu/ai-tracker/package.json 2>/dev/null || echo "❌ Cannot read package.json"
echo ""

echo "========================================="
echo "Diagnostics Complete"
echo "========================================="
