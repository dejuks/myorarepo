# ORA Platform — User Management Service

Owns user profiles, the role catalog, role assignment, and account lifecycle for the ORA Digital Platform. See `docs/01-architecture.md` (platform monorepo root) and `docs/erd.md` (this folder) for the `user_db` schema.

## Responsibilities

Creates user profiles (`POST /users`, id supplied by the caller — the same UUID later used to register login credentials with `auth-service`); serves profile reads (`GET /users/me`, `GET /users/:id`, `GET /users` admin list with search/pagination); updates profile fields; manages account status transitions (`PENDING → ACTIVE → SUSPENDED/DEACTIVATED`, enforced as a state machine); manages the platform role catalog and per-user role assignment. It does not store credentials, passwords, or tokens — see `auth-service` for that, and see the identity/profile split explained in the Phase 1 architecture doc.

This service never issues JWTs; it only verifies access tokens issued by `auth-service`, using the same `JWT_ACCESS_SECRET`.

### Auto-activation (`PENDING` → `ACTIVE`)

A profile created via `POST /users` always starts `PENDING`. Activation now requires the account owner to actually prove they control the email address: `src/infrastructure/messaging/auth-event-consumer.ts` subscribes to auth-service's `ora.auth.events` exchange (`AUTH_EXCHANGE` env var, default `ora.auth.events`) and, on `auth.email_verification.completed` — published only once someone clicks the link in the verification email and `POST /auth/verify-email` succeeds — calls `UserService.changeStatus(userId, { status: 'ACTIVE' }, 'system:auth-event-consumer')` for that user. Merely registering login credentials (`auth.registered`) is deliberately NOT the trigger: that event fires immediately at registration, before verification, and this consumer ignores it. Same async, eventually-consistent pattern as every other cross-service reaction in this platform (see `docs/01-architecture.md` §5), not a new synchronous call back into user-service. It's idempotent: a redelivered event for an already-`ACTIVE` user is a silent no-op (no duplicate `user.status_changed` event), and one for a `SUSPENDED`/`DEACTIVATED` user is logged and dropped rather than retried forever. In the rare case this consumer can't start (RabbitMQ unreachable at boot) or a message is dead-lettered, an admin can still activate manually via `PATCH /users/:id/status` (also used by the web admin UI's "Change status" action). See `services/auth-service/README.md` for the actual verification-token flow (request/store/email/confirm) — that entire flow lives in auth-service, since it's the service that owns login credentials and account status.

### Role-based permissions

Platform-wide roles (`USER`, `ADMIN`, and any custom roles created via `POST /roles`) each grant a set of fine-grained permissions from a fixed catalog (`permissions` table, seeded by the `AddPermissions` migration — see `src/application/services/permission.service.ts` for the full list, currently `users.view`, `users.manage`, `roles.view_catalog`, `roles.manage_catalog`, `roles.assign`). `ADMIN` is granted every permission that existed at migration time; a new permission added by a later migration is NOT retroactively granted anywhere and must be turned on explicitly per role.

A role's permission set is edited from that role's own edit view on the Admin → Roles page (`GET`/`PUT /roles/:id/permissions`, both requiring `roles.manage_catalog`) — grouped checkboxes by category, in the same spirit as GitHub's OAuth "Select scopes" screen. There is no separate roles × permissions matrix page.

**This is real, server-side enforcement, not a UI-only restriction.** `requirePermission()`/`requireSelfOrPermission()` (`src/api/middleware/permission.middleware.ts`) gate the specific endpoints below by permission key instead of a blanket "is ADMIN" check, and — critically — do a **live database lookup on every request** of both the caller's current role assignments and those roles' current permissions (`PermissionService.userHasPermission`). Neither side is read from the JWT's `roles` claim. That means editing a role's permissions, or assigning/revoking a role on a user, takes effect on that user's very next API call — no re-login, token refresh, or restart required:

| Endpoint | Required permission |
|---|---|
| `GET /users` | `users.view` |
| `PATCH /users/:id`, `PATCH /users/:id/status` | self, or `users.manage` |
| `POST /users/:id/roles`, `DELETE /users/:id/roles/:roleName` | `roles.assign` |
| `POST /roles`, `DELETE /roles/:id` | `roles.manage_catalog` |
| `GET /permissions`, `GET`/`PUT /roles/:id/permissions` | `roles.manage_catalog` |

`GET /roles` (listing role names) and `GET /users/:id` (a single profile) remain open to any authenticated user, unchanged.

## Quick start

```bash
cp .env.example .env
npm install
npm run typeorm -- migration:run   # seeds the 6 system roles, the permission catalog, and grants ADMIN every permission
npm run dev                         # http://localhost:4002, docs at /api-docs
```

Or with Docker: `docker compose up --build`

## Testing

```bash
npm test         # unit tests (UserService/RoleService/PermissionService via in-memory repository fakes)
npm run test:cov
```

## Super-admin bootstrap

If `SUPER_ADMIN_EMAIL` is set, an `ACTIVE` profile for that email is created once at startup (idempotent — skipped on every subsequent boot once it exists) and assigned both the `USER` and `ADMIN` roles, using `SUPER_ADMIN_FIRST_NAME`/`SUPER_ADMIN_LAST_NAME` (default "Super"/"Admin") for the name fields. The user id is derived deterministically from the email (UUID v5) so this service and `auth-service` agree on the same id for the same email without calling each other — both must be given the exact same `SUPER_ADMIN_EMAIL`. See `TESTING.md` in the repo root for the default local-dev credentials and a production warning.

## Notes on cross-service consistency

`auth-service` embeds a role-name snapshot into each access token at login. **Other** services that only have `requireRoles()`-style JWT-claim checks (journal-service, ebook-service, etc.) still see a role change take effect on the user's next login or token refresh, not instantly — a deliberate eventual-consistency trade-off (see `docs/01-architecture.md` §5) that avoids a synchronous call from every other service back to `user-service` on every request. `user.role_assigned` / `user.role_revoked` / `user.status_changed` events are published to RabbitMQ for any service that needs to react sooner (e.g. `notification-service`).

**Within this service**, the permission-gated endpoints listed above are the exception to that trade-off: they deliberately bypass the JWT's `roles` claim and query current role assignments and permissions from `user_db` directly on every request (see "Role-based permissions" above), so they don't have that staleness window. This was a deliberate, narrower design choice for this one feature, not a change to the platform-wide JWT-snapshot model — endpoints elsewhere (here and in other services) that still call `requireRoles()`/`requireSelfOrRoles()` are unaffected and keep the login/refresh-cycle staleness described above.
