# Security notes

## Hardening checklist
- Use strong secrets from `.env` only.
- Keep PostgreSQL on the internal network.
- Do not expose ports for the database in production.
- Validate every request on the server side.
- Use restrictive CORS and rate limiting.
- Store uploaded files outside the document root.
- Never log secrets or raw credentials.

## File upload requirements
- Validate extension and MIME.
- Detect and reject executable content.
- Generate random names for uploaded files.
- Store files outside the source tree.
- Restrict access to uploaded proofs and evidence.

## Auth and sessions
- Use Argon2id or bcrypt.
- Keep session cookies secure and HttpOnly.
- Enforce expiration and logout cleanup.
- Authorize admin actions by role.
