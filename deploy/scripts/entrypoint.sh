#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
cd /app/tendrovik-backend

if [ -d "drizzle" ] && [ -n "$(ls -A drizzle/*.sql 2>/dev/null)" ]; then
  for f in drizzle/*.sql; do
    echo "[entrypoint] Applying migration: $f"
    PGPASSWORD="${POSTGRES_PASSWORD}" psql \
      "${DATABASE_URL}" \
      -f "$f" \
      --set ON_ERROR_STOP=1 2>/dev/null || echo "[entrypoint] Migration $f already applied or skipped"
  done
fi

cd /app
echo "[entrypoint] Starting application..."
exec "$@"
