# ORA Platform — Repository Service

Owns roles and role assignments for the ORA Repository Management System — standalone RBAC for institutional-repository deposit and curation workflows (deposit/curation workflows live in a future pass; this slice is authorization only). See `docs/erd.md` (this folder) for the `repository_db` schema and the standalone-RBAC design note.

## How it works

This module owns its role catalog (`roles`) and member-to-role assignment (`user_role_assignments`) entirely in its own database — **zero runtime dependency on user-service or auth-service for authorization**. It only trusts the JWT (verified locally, same shared `JWT_ACCESS_SECRET` contract every service uses) for the caller's *identity* (`userId`, `email`). It never calls another service over HTTP to check what role someone has; that lookup is 100% local. There is no separate `Permission` entity — "permission" is expressed entirely as `requireRoles(...)` guards on routes.

## Role catalog

| Role | Description |
| --- | --- |
| `RESEARCHER_AUTHOR` (base role) | Individual depositing their scholarly work into the repository: uploads documents and datasets, provides complete and accurate bibliographic metadata (Dublin Core), specifies the access level (Open/Restricted). |
| `REPOSITORY_CURATOR` | Trusted staff member who manages deposits, metadata, and access policies: validates metadata quality, enriches records with controlled vocabularies, verifies copyright policies, applies access controls. |
| `CONTENT_REVIEWER` | Subject-matter expert who verifies the academic integrity of submissions: assesses academic quality and relevance, checks for plagiarism, recommends approval or revision. |
| `REPOSITORY_ADMINISTRATOR` (top role) | Oversees the overall operations and policies of the repository: makes the final approval on all submissions, manages access control policies, generates analytics reports. Only role allowed to create/delete custom roles and assign/revoke roles for other members. |

All four are seeded as `is_system = true` by the initial migration and cannot be deleted through the API.

## Quick start

```bash
cp .env.example .env
npm install
npm run typeorm -- migration:run   # seeds the role catalog
npm run dev                         # http://localhost:4004, docs at /api-docs
```

Or with Docker: `docker compose up --build`

## Testing

```bash
npm test         # unit tests (RoleService/MemberRoleService/bootstrapModuleAdmin via in-memory repository fakes)
npm run test:cov
```

## Module-admin bootstrap

If `SUPER_ADMIN_EMAIL` is set, the platform super-admin's deterministic userId (UUID v5, same derivation every service in the platform uses — see `src/common/utils/bootstrap-id.util.ts`) is assigned both `RESEARCHER_AUTHOR` (base role) and `REPOSITORY_ADMINISTRATOR` (top role) once at startup. Idempotent — safe to leave set across every restart; an existing assignment is skipped (logged at debug), and a missing system role (migrations not yet run) is skipped with a warning rather than throwing.

## REST surface

All routes are mounted under `/api/v1` and literally start with `/repository`, matching the gateway's `/api/v1/repository` prefix (the gateway forwards the full path unchanged):

- `GET  /api/v1/repository/roles` — list the role catalog. `requireAuth`.
- `POST /api/v1/repository/roles` — create a custom (non-system) role. `requireAuth, requireRoles(REPOSITORY_ADMINISTRATOR)`.
- `DELETE /api/v1/repository/roles/:id` — delete a custom role (system roles protected). `requireAuth, requireRoles(REPOSITORY_ADMINISTRATOR)`.
- `GET  /api/v1/repository/members/:userId/roles` — list a member's roles. `requireAuth, requireSelfOrRoles('userId', REPOSITORY_ADMINISTRATOR)`.
- `POST /api/v1/repository/members/:userId/roles` — assign a role to a member (body: `{ roleName }`). `requireAuth, requireRoles(REPOSITORY_ADMINISTRATOR)`.
- `DELETE /api/v1/repository/members/:userId/roles/:roleName` — revoke a role from a member. `requireAuth, requireRoles(REPOSITORY_ADMINISTRATOR)`.

Plus `GET /health`, `GET /health/ready` (DB-only readiness check) and Swagger docs at `/api-docs`.
