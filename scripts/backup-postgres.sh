#!/usr/bin/env bash
set -euo pipefail

DATE_STAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-$(pwd)/backups}"
mkdir -p "$BACKUP_DIR"

POSTGRES_DB="${POSTGRES_DB:-$(docker compose exec -T postgres printenv POSTGRES_DB | tr -d '\r')}"
POSTGRES_USER="${POSTGRES_USER:-$(docker compose exec -T postgres printenv POSTGRES_USER | tr -d '\r')}"
: "${POSTGRES_DB:?Start the postgres service or set POSTGRES_DB}"
: "${POSTGRES_USER:?Start the postgres service or set POSTGRES_USER}"

BACKUP_PATH="$BACKUP_DIR/backup_${DATE_STAMP}.sql.gz"
UPLOADS_PATH="$BACKUP_DIR/uploads_${DATE_STAMP}.tar.gz"

docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$BACKUP_PATH"
docker compose exec -T api tar -czf - -C /app/uploads . > "$UPLOADS_PATH"

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
if [[ ! "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "BACKUP_RETENTION_DAYS must be a non-negative integer" >&2
  exit 1
fi
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'backup_*.sql.gz' -o -name 'uploads_*.tar.gz' \) -mtime "+$RETENTION_DAYS" -delete

echo "Database backup created: $BACKUP_PATH"
echo "Uploads backup created: $UPLOADS_PATH"
