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
- API: http://localhost:3000
- Reverse proxy: http://localhost
- PostgreSQL: internal network only

## Database migration flow

```bash
docker compose exec postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -f /docker-entrypoint-initdb.d/schema.sql
```

For a production-like workflow, keep the SQL migrations in `database/migrations/` and run them through an application migration step in the API container.

## Backup

```bash
bash scripts/backup-postgres.sh
```

## Restore

```bash
bash scripts/restore-postgres.sh backups/backup_YYYYMMDD_HHMMSS.sql.gz
```
