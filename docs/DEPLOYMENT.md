# Deployment guide

## Requirements
- Docker Engine
- Docker Compose
- `.env` file based on `.env.example`

## Local startup

```bash
cp .env.example .env
# edit secrets before starting

docker compose up --build
```

## Services
- Frontend: http://localhost:8080
- Reverse proxy: http://localhost
- API: internal Docker network, proxied under `/api/`
- PostgreSQL: internal Docker network only

The host-published web preview binds to `127.0.0.1:8080`. The reverse proxy is the public HTTP entry point; neither the API nor PostgreSQL publishes a host port.

## Database migration flow

At API startup, numbered SQL files in `database/migrations/` run in filename order. Applied filenames are recorded in `schema_migrations`; each migration runs in a transaction and is skipped on later starts. Keep deployed migrations immutable and add a new numbered file for schema changes.

The legacy seed is applied before migrations. Migration `007_normalized_catalog.sql` copies existing plants and their categories once; later catalog changes use normalized tables and are not overwritten by the legacy seed.

Before production startup, set unique values for `POSTGRES_PASSWORD`, `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the server's untracked `.env` file. The sample values are placeholders.

## Backup

```bash
bash scripts/backup-postgres.sh
bash scripts/install-backup-cron.sh
```

On Ubuntu, the installer adds a nightly 02:00 cron entry and writes logs to `backups/backup.log`. Configure `BACKUP_CRON_SCHEDULE` and `BACKUP_RETENTION_DAYS` before installation to adjust it. It does not install or enable a cron daemon.

## Restore

```bash
bash scripts/restore-postgres.sh backups/backup_YYYYMMDD_HHMMSS.sql.gz
```

For a restore rehearsal, use an isolated Compose project and separate empty volumes: restore a matching database and uploads archive, start the API, and verify `/api/health`, a known public order, and an authenticated admin attachment. Never rehearse by restoring over the live data volume.
