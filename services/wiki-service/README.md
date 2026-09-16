# ORA Platform — Wiki Service

Owns roles and role assignments for the Oromo Wikipedia Platform — standalone RBAC for content moderation and governance (article creation/editing workflows live in a future pass; this slice is authorization only). See `docs/erd.md` for the `wiki_db` schema and the standalone-RBAC rationale.

## Responsibilities

Manages this module's role catalog (`GET/POST /api/v1/wiki/roles`, `DELETE /api/v1/wiki/roles/:id`) and per-member role assignment within the module (`GET/POST /api/v1/wiki/members/:userId/roles`, `DELETE /api/v1/wiki/members/:userId/roles/:roleName`). It does not store user profiles, credentials, passwords, or tokens, and it never calls `user-service` or `auth-service` over HTTP — authorization is resolved entirely from this service's own `wiki_db`, trusting only the JWT for the caller's identity (`userId`, `email`).

This service never issues JWTs; it only verifies access tokens issued by `auth-service`, using the same `JWT_ACCESS_SECRET`.

## Role model

No separate granular Permission entity — same decision as `user-service` (see its README). "Permission" here is expressed entirely as `requireRoles(...)` / `requireSelfOrRoles(...)` guards on routes. The seeded system role catalog, condensed from the platform SRS:

| Role | Description |
| --- | --- |
| `REGISTERED_EDITOR` (base role) | Community member who actively creates and edits articles in Afaan Oromo: creates new articles, edits existing content, uploads free-license images/media, participates in policy discussions. |
| `ADMINISTRATOR` ("Sysop" in the SRS) | Trusted user with elevated rights to manage content and user behavior to maintain the wiki's integrity: deletes/restores pages, blocks vandals and disruptive IPs, protects sensitive pages from edits, closes deletion discussions. |
| `BUREAUCRAT` (top role) | Senior user responsible for managing user roles and global platform actions: promotes or demotes local administrators, renames user accounts globally, oversees governance policies. The only role allowed to create/delete custom roles and assign/revoke roles for other members. |
| `OVERSIGHTER` ("CheckUser" in the SRS) | Highly trusted user with access to sensitive information for abuse control, bound by strict privacy guidelines: suppresses revisions containing private data (e.g. GDPR compliance), views user IP addresses only in serious cases of abuse. |

All four are `is_system = true` (seeded by migration, not deletable through the API).

## Permission model

Role/permission **catalog** management (creating or deleting a role) is platform-`ADMIN`-only — not even `BUREAUCRAT` can do this anymore. Assigning/revoking an *existing* role to a member stays with `BUREAUCRAT`. In both cases, a caller holding the platform-wide `ADMIN` role (issued by `user-service`/`auth-service`, carried in the JWT `roles` claim) automatically passes every `BUREAUCRAT` check too, with no module-local role assignment needed — see `src/api/middleware/auth.middleware.ts` (`requireAdmin`, and the `PLATFORM_ADMIN_ROLE` override baked into `requireRoles`/`requireSelfOrRoles`).

## Quick start

```bash
cp .env.example .env
npm install
npm run typeorm -- migration:run   # seeds the 4 system roles
npm run dev                         # http://localhost:4008, docs at /api-docs
```

Or with Docker: `docker compose up --build` (standalone dev compose — its own `wiki-db`, host port `5440`, no Redis, no RabbitMQ).

## Testing

```bash
npm test         # unit tests (RoleService/MemberRoleService/bootstrap via in-memory repository fakes)
npm run test:cov
```

## Module-admin bootstrap

If `SUPER_ADMIN_EMAIL` is set, the same chicken-and-egg problem the platform-wide super-admin bootstrap solves elsewhere applies here: the very first person able to assign roles in this module needs a role already assigned by *someone*. At startup, `bootstrapModuleAdmin` derives a deterministic user id from that email (UUID v5, the same `computeBootstrapUserId` scheme every service in the platform shares) and assigns that id both `REGISTERED_EDITOR` and `BUREAUCRAT`, idempotently — safe to leave the env var set across every restart. This service holds no user profile, so unlike `user-service`'s bootstrap there is no profile row to create, only role assignments.

## Notes on cross-service consistency

Like every other service, `requireAuth`/`requireRoles`/`requireSelfOrRoles` trust the `roles` claim embedded in the access token at login (the same shared-JWT eventual-consistency trade-off documented in `user-service`'s README) rather than making a synchronous call back to another service on every request. What makes this service standalone is that the role *catalog* and role *assignments themselves* — the source of truth those claims eventually reflect — live entirely in `wiki_db` and are read/written only by this service's own repositories; no other service's database or HTTP API is ever consulted.
