#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEDULE="${BACKUP_CRON_SCHEDULE:-0 2 * * *}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
MARKER="# PLANTI_LOVERS_BACKUP_JOB"

if [[ ! "$SCHEDULE" =~ ^([0-9*,-/]+[[:space:]]+){4}[0-9*,-/]+$ ]]; then
  echo "BACKUP_CRON_SCHEDULE must contain five cron fields" >&2
  exit 1
fi
if [[ ! "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "BACKUP_RETENTION_DAYS must be a non-negative integer" >&2
  exit 1
fi

CRONTAB_FILE="$(mktemp)"
trap 'rm -f "$CRONTAB_FILE"' EXIT
crontab -l 2>/dev/null | sed "/$MARKER/d" > "$CRONTAB_FILE" || true
printf '%s BACKUP_RETENTION_DAYS=%s bash "%s/scripts/backup-postgres.sh" >> "%s/backups/backup.log" 2>&1 %s\n' \
  "$SCHEDULE" "$RETENTION_DAYS" "$PROJECT_DIR" "$PROJECT_DIR" "$MARKER" >> "$CRONTAB_FILE"
crontab "$CRONTAB_FILE"

echo "Nightly backup scheduled at $SCHEDULE; logs: $PROJECT_DIR/backups/backup.log"
