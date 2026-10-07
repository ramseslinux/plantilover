#!/usr/bin/env bash
set -euo pipefail

DATE_STAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-$(pwd)/backups}"
mkdir -p "$BACKUP_DIR"

: "${POSTGRES_DB:?Set POSTGRES_DB in the environment or .env}"
: "${POSTGRES_USER:?Set POSTGRES_USER in the environment or .env}"

BACKUP_PATH="$BACKUP_DIR/backup_${DATE_STAMP}.sql.gz"

docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$BACKUP_PATH"

echo "Backup created: $BACKUP_PATH"
