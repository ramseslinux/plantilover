#!/usr/bin/env bash
set -euo pipefail

BACKUP_PATH="${1:-}"

if [[ -z "$BACKUP_PATH" ]]; then
  echo "Usage: $0 <backup.sql.gz>"
  exit 1
fi

: "${POSTGRES_DB:?Set POSTGRES_DB in the environment or .env}"
: "${POSTGRES_USER:?Set POSTGRES_USER in the environment or .env}"

docker compose up -d postgres

gunzip -c "$BACKUP_PATH" | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "Restored from: $BACKUP_PATH"
