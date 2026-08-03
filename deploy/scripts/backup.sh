#!/bin/bash
set -euo pipefail

BACKUP_DIR="/var/backups/tendrovik"
RETENTION_DAYS=14
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/tendrovik_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[backup] Starting PostgreSQL backup at $(date)"

docker exec komexpo-miniapp-db-1 \
  pg_dump -U tendrovik -d tendrovik --no-owner --no-privileges \
  | gzip > "${BACKUP_FILE}"

chmod 600 "${BACKUP_FILE}"

echo "[backup] Created: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

find "${BACKUP_DIR}" -name "tendrovik_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[backup] Cleaned backups older than ${RETENTION_DAYS} days"

UPLOAD_DIR="/var/www/comx.ru/uploads"
if [ -d "${UPLOAD_DIR}" ]; then
  UPLOAD_BACKUP="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"
  tar czf "${UPLOAD_BACKUP}" -C "${UPLOAD_DIR}" . 2>/dev/null || true
  chmod 600 "${UPLOAD_BACKUP}"
  echo "[backup] Uploads backup: ${UPLOAD_BACKUP}"
fi

echo "[backup] Done at $(date)"
