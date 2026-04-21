# Deployment Troubleshooting Guide

The site is unreachable - here are the most likely causes and how to fix them:

## 🔴 Most Likely Issue: Path Mismatch

**Problem:** `ecosystem.config.cjs` points to `/home/ubuntu/ai-tracker` but your app is at `/opt/ai-traker`

**Quick Fix:**
```bash
# SSH into your server
ssh -i your-key.pem ubuntu@your-server-ip

# Check which path has your app
ls -la /opt/ai-traker/.next/standalone/server.js
ls -la /home/ubuntu/ai-tracker/.next/standalone/server.js

# If app is at /opt/ai-traker, run the fix script:
cd /opt/ai-traker
bash fix-deployment-paths.sh
```

---

## 🔧 Step-by-Step Deployment Recovery

### 1. Check Current Status
```bash
# See if PM2 is running
pm2 status

# Check for errors
pm2 logs ai-traker --lines 50 --nostream
```

### 2. Identify Actual App Location
```bash
# The app should be at one of these locations
ls -la /opt/ai-traker/.git
ls -la /home/ubuntu/ai-tracker/.git

# Remember the path that has .git for the next steps
# Let's call it $APP_DIR
```

### 3. Stop Current Process
```bash
pm2 stop ai-traker
pm2 delete ai-traker
```

### 4. Rebuild the App
```bash
cd $APP_DIR  # Use the path from step 2

# Pull latest changes
git pull origin main

# Install dependencies
npm ci

# Build for production
npm run build

# Verify build succeeded
ls -la .next/standalone/server.js
```

### 5. Verify Environment Variables
```bash
# Check .env.local exists
cat $APP_DIR/.env.local

# Should show these (at minimum):
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
# API_KEY_ENCRYPTION_SECRET=...

# If missing any, add them
nano $APP_DIR/.env.local
```

### 6. Test Local Connectivity
```bash
cd $APP_DIR

# Test if app can start on port 3001
PORT=3001 npm start

# In another terminal:
sleep 5
curl http://127.0.0.1:3001/

# Press Ctrl+C to stop
```

### 7. Start with PM2
```bash
# From app directory
cd $APP_DIR

# Start process
pm2 start ecosystem.config.cjs

# Check status
pm2 status

# Watch logs in real-time
pm2 logs ai-traker
```

### 8. Verify Nginx
```bash
# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

# Check nginx is running
sudo systemctl status nginx

# Check nginx can reach the app
curl -H "Host: aispen.site" http://127.0.0.1/
```

---

## 🐛 Debugging: Common Issues

### Issue: "Port 3000 already in use"
```bash
# Find what's using port 3000
lsof -i :3000

# Kill it
sudo kill -9 <PID>

# Or restart from PM2
pm2 restart ai-traker
```

### Issue: "Cannot connect to 127.0.0.1:3000"
```bash
# Check if app is actually running
pm2 status

# Check app logs for errors
pm2 logs ai-traker --lines 100 --nostream

# Common errors:
# - Missing NEXT_PUBLIC_SUPABASE_URL
# - Missing API_KEY_ENCRYPTION_SECRET
# - Database connection timeout
```

### Issue: "Nginx returns 502 Bad Gateway"
```bash
# This means nginx can't reach the app at http://127.0.0.1:3000

# 1. Verify app is running
pm2 status

# 2. Test local connection
curl http://127.0.0.1:3000

# 3. Check nginx logs
sudo tail -50 /var/log/nginx/error.log
```

### Issue: "Domain not resolving"
```bash
# Check DNS
nslookup aispen.site

# If not resolving:
# - Check Route 53 (or your DNS provider)
# - Verify A record points to your EC2 server IP
# - Wait for DNS propagation (up to 24 hours)
```

---

## 🚀 Quick Restart Everything

```bash
#!/usr/bin/env bash
# All-in-one restart script

cd /opt/ai-traker  # Or your app directory

echo "Stopping PM2..."
pm2 stop ai-traker || true

echo "Pulling latest code..."
git pull origin main

echo "Installing dependencies..."
npm ci

echo "Building..."
npm run build

echo "Starting with PM2..."
pm2 restart ai-traker || pm2 start ecosystem.config.cjs

echo "Restarting nginx..."
sudo systemctl restart nginx

echo "Waiting for app to start..."
sleep 3

echo "Checking status..."
pm2 status
echo ""
echo "Testing connection..."
curl -I http://127.0.0.1:3000 || echo "App not responding yet"
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] `pm2 status` shows `ai-traker` running
- [ ] `curl http://127.0.0.1:3000` returns HTML (not 502)
- [ ] `.env.local` has all required variables
- [ ] `sudo nginx -t` returns "successful"
- [ ] `sudo systemctl status nginx` shows "active (running)"
- [ ] Can access `aispen.site` in browser
- [ ] Can reach `/api/providers` endpoint
- [ ] Can login and see dashboard

---

## 📞 Still Not Working?

1. **Provide PM2 logs:**
   ```bash
   pm2 logs ai-traker --lines 100 --nostream > logs.txt
   # Share logs.txt
   ```

2. **Provide nginx errors:**
   ```bash
   sudo tail -100 /var/log/nginx/error.log > nginx-errors.txt
   # Share nginx-errors.txt
   ```

3. **Run diagnostics:**
   ```bash
   bash diagnose-deployment.sh > diagnostics.txt
   # Share diagnostics.txt
   ```
