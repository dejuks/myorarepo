# ORA Platform — Journal Service

Owns roles and role assignments for the ORA Journal Management System —
standalone RBAC for journal editorial workflows (manuscript submission,
peer review, editorial decisions live in a future pass; this slice is
authorization only). See `docs/erd.md` (this folder) for the `journal_db`
schema and the standalone-RBAC design rationale.

## How it works

This service is fully standalone: zero runtime dependency on `user-service`
or `auth-service` for authorization. It verifies the platform JWT locally
(same shared `JWT_ACCESS_SECRET` contract as every other service) to learn
the caller's *identity* (`userId`, `email`) only — it never calls another
service over HTTP to check what role someone has. That lookup is 100% local
to this service's own `roles` / `user_role_assignments` tables.

There is no separate `Permission` entity — "permission" here is expressed
entirely as `requireRoles(...)` guards on routes, matching the platform's
role-only authorization model (see `services/user-service/README.md`).

## Role catalog

Seeded by the initial migration, all `is_system = true`:

| Role | Description |
| --- | --- |
| `JOURNAL_MANAGER` (top role) | Configures journal settings, sections, and submission policies; maintains the peer-review workflow; oversees technical performance of the journal. The only role allowed to create/delete custom roles and assign/revoke roles for other members. |
| `EDITOR_IN_CHIEF` | Senior academic leader with ultimate authority over a journal's content and quality; makes the final accept/reject decision on manuscripts, assigns Associate Editors, ensures academic and ethical compliance. |
| `ASSOCIATE_EDITOR` | Subject-matter expert who manages peer review for assigned manuscripts: conducts initial screening, selects and invites reviewers, evaluates feedback, recommends a decision to the EIC. |
| `REVIEWER` | External subject-matter expert who reviews manuscript content for methodology, ethics, and quality; provides structured, confidential feedback; adheres to blinded review policies. |
| `AUTHOR` (base role) | Researcher submitting work for publication: submits manuscripts with required metadata, responds to reviewer comments with revisions, ensures originality and ethical compliance. Assigned automatically alongside `JOURNAL_MANAGER` when the platform super-admin is bootstrapped. |

## Quick start

```bash
cp .env.example .env
npm install
npm run typeorm -- migration:run   # seeds the 5 system roles
npm run dev                         # http://localhost:4005, docs at /api-docs
```

Or with Docker: `docker compose up --build`

## Testing

```bash
npm test
```

Covers `RoleService` (role catalog CRUD), `MemberRoleService` (assign /
revoke / list a member's roles), and `bootstrapModuleAdmin` (idempotent
bootstrap of the module admin's role assignments), all via in-memory
repository fakes.

## Module-admin bootstrap

If `SUPER_ADMIN_EMAIL` is set, the platform's deterministic bootstrap user
id for that email (UUID v5, same namespace constant as every other service)
is assigned both `AUTHOR` and `JOURNAL_MANAGER` once at startup — idempotent,
skipped (logged at debug) if the assignment already exists. This solves the
same chicken-and-egg problem as the platform-wide super-admin bootstrap: the
first person able to assign roles in this module needs a role already
assigned by someone.

## Permission model

Role/permission **catalog** management (creating or deleting a role) is platform-`ADMIN`-only — not even `JOURNAL_MANAGER` can do this anymore. Assigning/revoking an *existing* role to a member stays with `JOURNAL_MANAGER`. In both cases, a caller holding the platform-wide `ADMIN` role (issued by `user-service`/`auth-service`, carried in the JWT `roles` claim) automatically passes every `JOURNAL_MANAGER` check too, with no module-local role assignment needed — see `src/api/middleware/auth.middleware.ts` (`requireAdmin`, and the `PLATFORM_ADMIN_ROLE` override baked into `requireRoles`/`requireSelfOrRoles`).

## REST surface

Mounted behind the gateway at `/api/v1/journals`:

- `GET /roles` — list this module's role catalog. Authenticated.
- `POST /roles` — create a custom (non-system) role. Platform `ADMIN` only.
- `DELETE /roles/:id` — delete a custom role (system roles protected). Platform `ADMIN` only.
- `GET /members/:userId/roles` — list a member's roles in this module. Self, `JOURNAL_MANAGER`, or `ADMIN`.
- `POST /members/:userId/roles` — assign a role to a member (`{ roleName }`). `JOURNAL_MANAGER` or `ADMIN`.
- `DELETE /members/:userId/roles/:roleName` — revoke a role from a member. `JOURNAL_MANAGER` or `ADMIN`.
