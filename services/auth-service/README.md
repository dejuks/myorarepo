# ORA Platform — Authentication Service

Owns credentials, tokens, MFA, and login sessions for the ORA Digital Platform. See `docs/01-architecture.md` (in the platform monorepo root) for how this service fits into the wider system, and `docs/erd.md` in this folder for the `auth_db` schema.

## Responsibilities

Registers login credentials for a userId created by `user-service`; authenticates email/password (+ optional TOTP MFA); issues short-lived access tokens and rotating refresh tokens; supports logout (single device and all devices); supports password change and self-service password reset; enforces per-account lockout and per-IP rate limiting on login. It does not store user profile data — see the identity/profile split in the architecture doc.

## Quick start

```bash
cp .env.example .env      # fill in real secrets before anything but local dev
npm install
npm run migrate:up        # or: npm run typeorm -- migration:run
npm run dev                # http://localhost:4001, docs at /api-docs
```

Or with Docker:

```bash
docker compose up --build
```

## Testing

```bash
npm test           # unit tests (AuthService tested via in-memory repository fakes, no DB required)
npm run test:cov   # with coverage
```

## API surface

All business endpoints are versioned under `/api/v1`; `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`, `POST /auth/change-password`, `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm`, `POST /auth/mfa/enroll`, `POST /auth/mfa/confirm`, `POST /auth/mfa/disable`. `GET /health` and `GET /health/ready` are unversioned, for the container orchestrator. Full request/response schemas are in Swagger UI at `/api-docs` once the service is running.

## Production notes

Rotate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` per environment and never commit them. Refresh tokens are rotated on every use and hashed at rest; reuse of a revoked refresh token revokes the entire token family, which is the standard defense against refresh-token theft. Account lockout (5 failed attempts → 15 minute lock) is enforced independently of the gateway/IP-based rate limiter, so a distributed attack against one account is still caught. This service is the identity provider for the platform — every other service verifies tokens locally using the shared public verification contract rather than calling back into `auth-service` on every request.
