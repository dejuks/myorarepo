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
| `LIBRARY_MANAGER` | Top role — oversees all library operations, staff, and policies for both digital and physical collections; the only role that can create/delete custom roles and assign/revoke roles for other members. |
| `ADMIN` | Digital-library system configuration and access-control role: creates/manages users, assigns roles/permissions, configures system settings, approves content uploads. |
| `SYSTEM_ADMINISTRATOR` | Maintains the library management software and backend systems: user accounts/permissions, hardware/software maintenance, backups and security. |
| `DIGITAL_LIBRARIAN` | Manages the digital resources within the library system. |
| `LIBRARIAN` | Manages day-to-day services for the physical library. |
| `ACQUISITION_OFFICER` | Handles procurement and processing of physical books and materials: ordering, vendor relations, receiving deliveries. |
| `CATALOGER` | Classifies and catalogs physical materials for retrieval. |
| `INVENTORY_MANAGER` | Maintains the physical inventory and performs audits. |
| `CONTENT_UPLOADER` | Optional role (e.g. teachers/assistants) submitting digital content for approval. |
| `EXTERNAL_PUBLISHER` | Optional role for external providers supplying licensed or subscribed content. |
| `MEMBER` | Base role — end-user of the library services, auto-assigned to the bootstrapped super-admin alongside `LIBRARY_MANAGER`. |

This module covers both the Digital and Physical Library Management sub-systems from the SRS in one service/database — `ADMIN` and `SYSTEM_ADMINISTRATOR` overlap in practice (both are system-configuration roles, one named per SRS sub-system) and are kept as distinct seeded roles for fidelity to the source document.

All six are seeded as `is_system = true` (not deletable through the API) by the initial migration.

## Module-admin bootstrap

If `SUPER_ADMIN_EMAIL` is set, the platform super-admin is assigned both `MEMBER` and `LIBRARY_MANAGER` in this module's database once at startup (idempotent — skipped on every subsequent boot once the assignment already exists). The member id is derived deterministically from the email (UUID v5, `computeBootstrapUserId`) so this service agrees with every other service on the same id for the same email without calling anyone over HTTP — see `docs/erd.md` for why.

## Permission model

Role/permission **catalog** management (creating or deleting a role) is platform-`ADMIN`-only — not even `LIBRARY_MANAGER` can do this anymore. Assigning/revoking an *existing* role to a member stays with `LIBRARY_MANAGER`. In both cases, a caller holding the platform-wide `ADMIN` role (issued by `user-service`/`auth-service`, carried in the JWT `roles` claim) automatically passes every `LIBRARY_MANAGER` check too, with no module-local role assignment needed — see `src/api/middleware/auth.middleware.ts` (`requireAdmin`, and the `PLATFORM_ADMIN_ROLE` override baked into `requireRoles`/`requireSelfOrRoles`). Note this module's own local `ADMIN` role (a seeded catalog entry, see above) is a different thing from the platform-wide `ADMIN` role described here — the two happen to share a name, but only the platform-wide one (from `user-service`) grants this override.

## REST surface

`GET /api/v1/library/roles` (auth), `POST /api/v1/library/roles` (platform `ADMIN`), `DELETE /api/v1/library/roles/:id` (platform `ADMIN`, system roles protected); `GET /api/v1/library/members/:userId/roles` (self, `LIBRARY_MANAGER`, or platform `ADMIN`), `POST /api/v1/library/members/:userId/roles` (`LIBRARY_MANAGER` or platform `ADMIN`), `DELETE /api/v1/library/members/:userId/roles/:roleName` (`LIBRARY_MANAGER` or platform `ADMIN`).
