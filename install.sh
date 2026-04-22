#!/usr/bin/env bash
set -euo pipefail

# EC2 bootstrap script for this app.
# Usage (on Ubuntu EC2):
#   chmod +x install.sh
#   DOMAIN=yourdomain.com GIT_REPO_URL=https://github.com/you/repo.git GIT_BRANCH=main CRON_SECRET=... ./install.sh

DOMAIN="${DOMAIN:-}"
GIT_REPO_URL="${GIT_REPO_URL:-}"
GIT_BRANCH="${GIT_BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/ai-tracker}"
CRON_SECRET="${CRON_SECRET:-}"
NODE_MAJOR="${NODE_MAJOR:-20}"

if [[ -z "$DOMAIN" ]]; then
  echo "ERROR: DOMAIN is required"
  exit 1
fi

if [[ -z "$GIT_REPO_URL" ]]; then
  echo "ERROR: GIT_REPO_URL is required"
  exit 1
fi

if [[ -z "$CRON_SECRET" ]]; then
  echo "ERROR: CRON_SECRET is required"
  exit 1
fi

echo "==> Updating apt packages"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git unzip software-properties-common

echo "==> Installing Node.js ${NODE_MAJOR}"
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
sudo apt-get install -y nodejs

echo "==> Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER" || true

echo "==> Installing Nginx"
sudo apt-get install -y nginx

echo "==> Installing PM2 + certbot"
sudo npm install -g pm2
sudo snap install core || true
sudo snap refresh core || true
sudo snap install --classic certbot || true
sudo ln -sf /snap/bin/certbot /usr/bin/certbot

echo "==> Cloning/updating repo"
sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER":"$USER" "$APP_DIR"

if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone -b "$GIT_BRANCH" "$GIT_REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout "$GIT_BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$GIT_BRANCH"
fi

echo "==> Building Docker image"
docker build -t ai-traker:latest "$APP_DIR"

echo "==> Restarting app container via PM2"
cat > "$APP_DIR/ecosystem.config.cjs" <<'EOF'
module.exports = {
  apps: [
    {
      name: "ai-traker",
      script: "docker",
      args: "run --rm --name ai-traker -p 3000:3000 --env-file /opt/ai-traker/.env.local ai-traker:latest",
      interpreter: "none",
      autorestart: true,
      max_restarts: 10
    }
  ]
}
EOF

pm2 delete ai-traker >/dev/null 2>&1 || true
pm2 start "$APP_DIR/ecosystem.config.cjs"
pm2 save
pm2 startup systemd -u "$USER" --hp "$HOME" || true

echo "==> Configuring Nginx"
sudo cp "$APP_DIR/nginx.conf" /etc/nginx/nginx.conf
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "==> Enabling SSL with certbot"
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" --redirect

echo "==> Installing cron job for midnight usage fetch"
CRON_FILE="/tmp/ai-traker-cron"
crontab -l > "$CRON_FILE" 2>/dev/null || true
grep -v "/api/cron/fetch-usage" "$CRON_FILE" > "${CRON_FILE}.new" || true
echo "0 0 * * * curl -fsS -H \"Authorization: Bearer $CRON_SECRET\" https://$DOMAIN/api/cron/fetch-usage >/tmp/ai-traker-cron.log 2>&1" >> "${CRON_FILE}.new"
crontab "${CRON_FILE}.new"
rm -f "$CRON_FILE" "${CRON_FILE}.new"

echo "==> Done"
echo "Remember to create $APP_DIR/.env.local before PM2 restart if missing."
