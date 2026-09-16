# ORA Platform — eBook Service

Owns roles and role assignments for the ORA eBook Publishing System — standalone RBAC for book publishing workflows (submission, editorial review, digital production, financial clearance live in a future pass; this slice is authorization only).

## How it works

This service is fully standalone: it has **zero runtime dependency on user-service or auth-service for authorization**. It trusts the JWT issued by auth-service (verified locally with the shared `JWT_ACCESS_SECRET` contract every service uses) only for the caller's *identity* (`userId`, `email`) — it never calls another service over HTTP to check what role someone has. Every role lookup is 100% local to this service's own `ebook_db` database.

Following the platform's role-only authorization model (see `services/user-service/README.md`), there is no separate granular `Permission` entity: a `roles` table holds this module's role catalog and a `user_role_assignments` table holds who has which role in this module. "Permission" is expressed entirely as `requireRoles(...)` guards on routes.

### Role catalog

| Role | Description |
| --- | --- |
| `BOOK_EDITOR` (**top role**) | Designated ORA staff member who oversees the entire book publishing workflow from submission to acceptance: performs initial manuscript screening, assigns peer reviewers, makes editorial decisions (accept/revise/reject), communicates with authors. The only role allowed to create/delete custom roles and assign/revoke roles for other members. |
| `DIGITAL_CONTENT_MANAGER` | Technical production role responsible for creating the final eBook product: validates file quality, converts manuscripts to PDF/EPUB, uploads final eBooks, assigns metadata (ISBN, DOI), sets access permissions. |
| `FINANCE_OPERATIONS_OFFICER` | Administrative role managing the financial aspects of book publication: manages Book Processing Charge payments, validates payments, issues invoices/receipts, approves/declines fee waiver requests. |
| `AUTHOR_RESEARCHER` (**base role**) | Individual submitting a manuscript for book publication: prepares and submits manuscripts with metadata, responds to peer-review feedback, approves the final proof. Assigned automatically alongside `BOOK_EDITOR` when the platform super-admin is bootstrapped. |

All four are seeded as `is_system = true` rows in the initial migration and cannot be deleted through the API.

### Bootstrap

Same chicken-and-egg problem as the platform-wide super-admin: the very first person able to assign roles in this module needs a role already assigned by *someone*. `src/infrastructure/bootstrap/module-admin.bootstrap.ts` is an idempotent function, run once at startup, that — if `SUPER_ADMIN_EMAIL` is set — computes `computeBootstrapUserId(email)` (the same deterministic UUID v5 every service in the platform derives for that email) and assigns that userId both `AUTHOR_RESEARCHER` (base role) and `BOOK_EDITOR` (top role). See `docs/erd.md` for more detail.

## Quick start

```bash
cp .env.example .env
npm install
npm run typeorm -- migration:run   # creates roles/user_role_assignments and seeds the role catalog
npm run dev                         # http://localhost:4006, docs at /api-docs
```

With Docker: `docker compose up --build`

## Testing

```bash
npm test
```

Covers `RoleService` (role catalog CRUD), `MemberRoleService` (assign/revoke/list role assignments), and `bootstrapModuleAdmin` (idempotent bootstrap seeding).

## REST surface

Mounted at `/api/v1` inside this service; the gateway forwards the full path unchanged, so from outside the platform these are reached at `/api/v1/ebooks/...`.

- `GET /roles` — list this module's role catalog. Authenticated.
- `POST /roles` — create a custom (non-system) role. `BOOK_EDITOR` only.
- `DELETE /roles/:id` — delete a custom role (system roles protected). `BOOK_EDITOR` only.
- `GET /members/:userId/roles` — list a member's roles in this module. Self or `BOOK_EDITOR`.
- `POST /members/:userId/roles` — assign a role to a member (body: `{ roleName }`). `BOOK_EDITOR` only.
- `DELETE /members/:userId/roles/:roleName` — revoke a role from a member. `BOOK_EDITOR` only.

`GET /health`, `GET /health/ready`, and `GET /api-docs` (Swagger UI) round out the surface.
