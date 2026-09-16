# ORA Platform — Library Service

Owns roles and role assignments for the ORA Library Management System (digital & physical) — standalone RBAC for circulation, cataloging, and inventory workflows (those workflows live in a future pass; this slice is authorization only). See `docs/erd.md` (this folder) for the `library_db` schema and the standalone-RBAC design note.

## Responsibilities

Manages this module's own role catalog (`GET/POST/DELETE /api/v1/library/roles`) and per-member role assignment (`GET/POST/DELETE /api/v1/library/members/:userId/roles`). `userId` is an opaque cross-service reference — exactly like `auth-service`'s `userId` field, this service holds no profile data (no name, no email) and has zero runtime dependency on `user-service` or `auth-service` for authorization. It only verifies the caller's JWT locally (same shared `JWT_ACCESS_SECRET` contract every service uses) to learn who is calling, then looks up that member's roles in its own database.

This is deliberately only the user-management slice of the Library module — no manuscript/book/lending business logic yet. Future endpoints for circulation, cataloging, and inventory will build on top of the `requireAuth`/`requireRoles`/`requireSelfOrRoles` middleware shipped here.

## Quick start

```bash
cp .env.example .env
npm install
npm run typeorm -- migration:run   # seeds the 6 library system roles
npm run dev                         # http://localhost:4007, docs at /api-docs
```

Or with Docker: `docker compose up --build`

## Testing

```bash
npm test         # unit tests (RoleService/MemberRoleService/bootstrap via in-memory repository fakes)
npm run test:cov
```

## Role catalog

| Role | Notes |
| --- | --- |
| `LIBRARY_MANAGER` | Top role — oversees all library operations; the only role that can create/delete custom roles and assign/revoke roles for other members. |
| `DIGITAL_LIBRARIAN` | Manages the digital resources within the library system. |
| `LIBRARIAN` | Manages day-to-day services for the physical library. |
| `CATALOGER` | Classifies and catalogs physical materials for retrieval. |
| `INVENTORY_MANAGER` | Maintains the physical inventory and performs audits. |
| `MEMBER` | Base role — end-user of the library services, auto-assigned to the bootstrapped super-admin alongside `LIBRARY_MANAGER`. |

All six are seeded as `is_system = true` (not deletable through the API) by the initial migration.

## Module-admin bootstrap

If `SUPER_ADMIN_EMAIL` is set, the platform super-admin is assigned both `MEMBER` and `LIBRARY_MANAGER` in this module's database once at startup (idempotent — skipped on every subsequent boot once the assignment already exists). The member id is derived deterministically from the email (UUID v5, `computeBootstrapUserId`) so this service agrees with every other service on the same id for the same email without calling anyone over HTTP — see `docs/erd.md` for why.

## REST surface

`GET /api/v1/library/roles` (auth), `POST /api/v1/library/roles` (`LIBRARY_MANAGER`), `DELETE /api/v1/library/roles/:id` (`LIBRARY_MANAGER`, system roles protected); `GET /api/v1/library/members/:userId/roles` (self or `LIBRARY_MANAGER`), `POST /api/v1/library/members/:userId/roles` (`LIBRARY_MANAGER`), `DELETE /api/v1/library/members/:userId/roles/:roleName` (`LIBRARY_MANAGER`).
