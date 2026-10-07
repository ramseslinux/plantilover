# Planti Lovers quotation system

A small, secure, mobile-first quotation platform for plant sales. This V1 focuses on the quotation flow, order lifecycle, admin actions, shipping, evidence, and production-friendly infrastructure without overengineering.

## Stack
- Node.js
- Express
- PostgreSQL-backed demo catalog and quotation snapshots
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
- API: http://localhost:3000
- Reverse proxy: http://localhost
- Health check: http://localhost:3000/health

## Admin credentials
The default bootstrap admin is:
- email: admin@example.com
- password: change_me_admin_password

Change these at runtime using environment variables before deployment in a real environment.

## Core flows implemented
- public catalog browsing
- demo catalog seeded in PostgreSQL (`demo_plants`)
- mobile cart and quote creation
- quotation snapshots persisted in PostgreSQL (`demo_quotation_orders`)
- public order lookup by public order number
- payment proof validation and rejection of unsafe uploads
- admin login and protected routes
- PED to ORD transition without duplicating orders
- shipping status updates and tracking capture
- evidence upload for packaging and shipping
- archive and restore flow for historical orders
- shipping-rate import and quote versioning

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

backend:
cd backend
npm install
npm test
npm run lint
```

## Backup and restore

```bash
bash scripts/backup-postgres.sh
bash scripts/restore-postgres.sh backups/backup_YYYYMMDD_HHMMSS.sql.gz
```

## Notes
- Docker is expected to be installed in the target environment before Compose startup.
- Admin sessions, audit entries, payment-proof/evidence metadata, and shipping-rate imports remain in memory in this demo version.
- This V1 is intentionally small and secure, with no overengineering.
