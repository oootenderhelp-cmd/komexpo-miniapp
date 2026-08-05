#!/bin/bash
set -euo pipefail

DOMAIN="comx.ru"
EMAIL="${1:?Usage: $0 your@email.com}"

echo "[ssl] Installing certbot..."
apt-get update -qq && apt-get install -y -qq certbot python3-certbot-nginx

echo "[ssl] Creating webroot directory..."
mkdir -p /var/www/certbot

echo "[ssl] Requesting certificate for ${DOMAIN} and www.${DOMAIN}..."
certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d "${DOMAIN}" \
  -d "www.${DOMAIN}" \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  --non-interactive

echo "[ssl] Certificate obtained. Reloading nginx..."
nginx -t && systemctl reload nginx

echo "[ssl] Setting up auto-renewal cron..."
echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" \
  | crontab -

echo "[ssl] Done. Certificate at /etc/letsencrypt/live/${DOMAIN}/"
