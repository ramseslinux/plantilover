# API endpoints

## Public
- GET /health
- GET /api/products
- GET /api/products/:slug
- GET /api/categories
- POST /api/orders
- GET /api/orders/:publicOrderNumber
- POST /api/orders/:publicOrderNumber/payment-proof

## Admin
- POST /api/admin/login
- POST /api/admin/logout
- GET /api/admin/orders
- GET /api/admin/orders/:id
- PATCH /api/admin/orders/:id
- PATCH /api/admin/orders/:id/shipping
- PATCH /api/admin/orders/:id/archive
- PATCH /api/admin/orders/:id/restore
- POST /api/admin/orders/:id/evidence
- POST /api/admin/products
- PATCH /api/admin/products/:id
- DELETE /api/admin/products/:id
- POST /api/admin/shipping-rates/import
- POST /api/admin/shipping-rates/quote

## Notes
- All body parameters are validated in the server layer.
- Untrusted files get MIME, extension, and content validation before acceptance.
- Session cookies are used for authenticated admin flows.
