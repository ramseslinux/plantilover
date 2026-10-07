# Planti Lovers quotation system

A small, secure, mobile-first quotation platform for plant sales. This V1 focuses on the quotation flow, order lifecycle, admin actions, shipping, evidence, and production-friendly infrastructure without overengineering.

## Stack
- Node.js
- Express
- PostgreSQL catalog and immutable quotation snapshots
- Docker + Docker Compose
- Mobile-first frontend
- Nginx reverse proxy
- Session-based admin authentication

## Project structure
- backend/
- frontend/
- database/
- docker/
- scripts/
- backups/
- docs/
- uploads/

## Requirements
- Docker Desktop or Docker Engine with Compose
- Node.js 20+
- Git

## Environment setup
1. Copy the sample file:

```bash
cp .env.example .env
```

2. Update the values in the local `.env` file before starting services.
3. Keep all secrets outside Git history.

## Local startup

```bash
docker compose up --build
```

Then access:
- Frontend: http://localhost:8080
- Reverse proxy: http://localhost
- Health check: http://localhost/api/health
- The API is available only inside the Docker network through the web/reverse proxy; PostgreSQL is private as well.

## Admin credentials
Set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` in `.env`. The API creates the initial administrator only when both values are configured; there are no built-in login credentials.

## Core flows implemented
- public catalog browsing
- PostgreSQL catalog in normalized `categories` and `products`; legacy `demo_plants` is retained as a one-time migration source
- mobile cart and quote creation
- quotation snapshots persisted in PostgreSQL (`orders` and `order_items`)
- public order lookup by public order number
- payment proof validation and rejection of unsafe uploads
- customer payment-proof upload from the order lookup screen
- admin login and protected routes
- PED to ORD transition without duplicating orders
- shipping status updates and tracking capture
- evidence upload for packaging and shipping
- admin review of each proof and protected download of evidence
- archive and restore flow for historical orders
- configurable automatic archiving for unpaid pending/cancelled orders, with separate active and historical dashboard views
- shipping-rate import and quote versioning
- CSV tariff import, postal-code/weight lookup, and shipping-cost snapshot on the same order

## API documentation
See [docs/API.md](docs/API.md) for the route list.

## Security and deployment notes
- PostgreSQL remains internal-only in the intended deployment.
- Secrets are never stored in Git.
- CORS is restricted.
- Session cookies are HttpOnly, SameSite=Lax, and expiration-oriented.
- Sensitive file uploads are validated against MIME, extension, and content.
- Uploaded files are stored outside the source tree and not served publicly without control.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/SECURITY.md](docs/SECURITY.md) for production guidance.

## Working commands

```bash
docker compose logs -f api
docker compose ps

cd backend
npm install
npm test
npm run lint
```

## Backup and restore

```bash
bash scripts/backup-postgres.sh
bash scripts/install-backup-cron.sh
bash scripts/restore-postgres.sh backups/backup_YYYYMMDD_HHMMSS.sql.gz
```

The installer registers a nightly 02:00 Ubuntu cron job and logs to `backups/backup.log`. Set `BACKUP_CRON_SCHEDULE` and `BACKUP_RETENTION_DAYS` before running it to change the schedule and retention. The backup script also creates a matching `uploads_YYYYMMDD_HHMMSS.tar.gz` archive for payment proofs and shipping evidence. Restore discovers the matching archive automatically; pass it as a second argument if the files have different names. Backups older than 30 days are removed by default.

## Notes
- Docker is expected to be installed in the target environment before Compose startup.
- Numbered migrations run automatically at startup. The existing plant catalog is copied to normalized `categories` and `products` tables; API reads and admin product changes now use that normalized catalog.
- Orders, admin sessions, audit entries, upload metadata, shipping-rate imports, and order shipping snapshots are stored in PostgreSQL; uploaded files use the persistent `uploads_data` Docker volume.
- This V1 is intentionally small and secure, with no overengineering.
