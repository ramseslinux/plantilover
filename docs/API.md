# API endpoints

## Public
- GET /health
- GET /api/health (reverse-proxy health check)
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
- GET /api/admin/settings/order-archive
- PATCH /api/admin/settings/order-archive
- POST /api/admin/orders/:id/evidence
- GET /api/admin/orders/:id/evidence
- GET /api/admin/orders/:id/evidence/:evidenceId/file
- GET /api/admin/orders/:id/payment-proofs
- GET /api/admin/orders/:id/payment-proofs/:proofId/file
- PATCH /api/admin/orders/:id/payment-proofs/:proofId
- POST /api/admin/products
- PATCH /api/admin/products/:id
- DELETE /api/admin/products/:id
- POST /api/admin/shipping-rates/import
- POST /api/admin/shipping-rates/quote

## Notes
- All body parameters are validated in the server layer.
- Shipping imports accept JSON entries or CSV text with `postalCode`, `service`, and `price` columns. Optional columns are `zone`, `weightMin`, `weightMax`, and `currency` (defaults to MXN). CSV source content is SHA-256 versioned.
- Shipping quotes require a five-digit postal code, service, and weight in kilograms. Applying a quote stores its provider, service, rate version, weight, postal-code, original price, and final price with the order.
- Untrusted files get MIME, extension, and content validation before acceptance.
- Session cookies are used for authenticated admin flows.
- Approving a proof updates its status and converts the same PED folio to ORD; it does not create another order.
- The administrator can set an inactivity period from 1 to 3650 days; dashboard reads archive unpaid pending/cancelled orders past that age and records the change in the audit log.
- Shipping updates persist a `order_shipping` snapshot and public lookups include a known carrier tracking link when one is available.
- A WhatsApp URL is returned only when `WHATSAPP_NUMBER` is configured; its message contains only the public folio.
