# ORA Platform — Authentication Service

Owns credentials, tokens, MFA, and login sessions for the ORA Digital Platform. See `docs/01-architecture.md` (in the platform monorepo root) for how this service fits into the wider system, and `docs/erd.md` in this folder for the `auth_db` schema.

## Responsibilities

Registers login credentials for a userId created by `user-service`; authenticates email/password (+ optional TOTP MFA); issues short-lived access tokens and rotating refresh tokens; supports logout (single device and all devices); supports password change and self-service password reset; requires email verification before an account can log in; enforces per-account lockout and per-IP rate limiting on login. It does not store user profile data — see the identity/profile split in the architecture doc.

### Email verification

Every new account starts `PENDING_VERIFICATION` and **login is rejected** (`assertAccountIsUsable` in `auth.service.ts`) until it's verified — there is no way around this except verifying or an admin manually activating the `user-service` profile. The flow mirrors the existing password-reset token pattern exactly:

1. `register()` generates a random 256-bit token, stores only its SHA-256 hash (`email_verification_tokens` table, 24-hour expiry), and publishes `auth.email_verification.requested` with the **raw** token embedded in a ready-made link (`{FRONTEND_URL}/verify-email?token=...`) — notification-service turns that into an actual email (console-logged in dev, since `EMAIL_PROVIDER=console` by default; see notification-service's README).
2. Clicking the link hits the frontend's `/verify-email` page, which calls `POST /auth/verify-email { token }`. On success this is the **only** thing that flips `PENDING_VERIFICATION` → `ACTIVE` here, and publishes `auth.email_verification.completed`, which `user-service` consumes to activate the matching profile (see `services/user-service/README.md` "Auto-activation").
3. If the link is lost or the 24-hour token expires, `POST /auth/verify-email/resend { email }` issues a fresh one (invalidating the previous one first) — same no-account-enumeration posture as password-reset (always 202, regardless of whether the email exists or is already verified).

This applies identically whether the account was created via self-registration or an admin/module-admin's "Create user" action — the person who owns that email address still has to prove it before the account can log in.

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

All business endpoints are versioned under `/api/v1`; `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`, `POST /auth/change-password`, `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm`, `POST /auth/verify-email`, `POST /auth/verify-email/resend`, `POST /auth/mfa/enroll`, `POST /auth/mfa/confirm`, `POST /auth/mfa/disable`. `GET /health` and `GET /health/ready` are unversioned, for the container orchestrator. Full request/response schemas are in Swagger UI at `/api-docs` once the service is running.

## Super-admin bootstrap

If `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` are both set, a login credential for that email is created once at startup (idempotent — skipped on every subsequent boot once it exists), with roles `['ADMIN', 'USER']`. This solves the chicken-and-egg problem of assigning the first `ADMIN` role, since doing so through the normal API requires an existing admin token. The user id is derived deterministically from the email (UUID v5), so this service and `user-service` agree on the same id without calling each other. See `TESTING.md` in the repo root for the default local-dev credentials and a production warning.

## Production notes

Rotate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` per environment and never commit them. Refresh tokens are rotated on every use and hashed at rest; reuse of a revoked refresh token revokes the entire token family, which is the standard defense against refresh-token theft. Account lockout (5 failed attempts → 15 minute lock) is enforced independently of the gateway/IP-based rate limiter, so a distributed attack against one account is still caught. This service is the identity provider for the platform — every other service verifies tokens locally using the shared public verification contract rather than calling back into `auth-service` on every request.
