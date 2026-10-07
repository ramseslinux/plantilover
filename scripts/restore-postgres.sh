#!/usr/bin/env bash
set -euo pipefail

BACKUP_PATH="${1:-}"
UPLOADS_PATH="${2:-}"

if [[ -z "$BACKUP_PATH" ]]; then
  echo "Usage: $0 <backup.sql.gz> [uploads.tar.gz]"
  exit 1
fi

if [[ -z "$UPLOADS_PATH" ]]; then
  FILE_NAME="$(basename "$BACKUP_PATH")"
  if [[ "$FILE_NAME" =~ ^backup_(.+)\.sql\.gz$ ]]; then
    CANDIDATE="$(dirname "$BACKUP_PATH")/uploads_${BASH_REMATCH[1]}.tar.gz"
    if [[ -f "$CANDIDATE" ]]; then
      UPLOADS_PATH="$CANDIDATE"
    fi
  fi
fi

POSTGRES_DB="${POSTGRES_DB:-$(docker compose exec -T postgres printenv POSTGRES_DB | tr -d '\r')}"
POSTGRES_USER="${POSTGRES_USER:-$(docker compose exec -T postgres printenv POSTGRES_USER | tr -d '\r')}"
: "${POSTGRES_DB:?Start the postgres service or set POSTGRES_DB}"
: "${POSTGRES_USER:?Start the postgres service or set POSTGRES_USER}"

docker compose up -d postgres

gunzip -c "$BACKUP_PATH" | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

if [[ -n "$UPLOADS_PATH" ]]; then
  docker compose up -d api
  docker compose exec -T api sh -c 'mkdir -p /app/uploads && tar -xzf - -C /app/uploads' < "$UPLOADS_PATH"
  echo "Uploads restored from: $UPLOADS_PATH"
fi

echo "Restored from: $BACKUP_PATH"
