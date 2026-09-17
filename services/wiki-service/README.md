# ORA Platform — Wiki Service

Owns the Oromo Wikipedia content layer (articles + full revision history) and roles/role assignments for content moderation and governance — fully standalone: it never calls another service over HTTP, per the platform's per-module-RBAC pattern. See `docs/erd.md` for the `wiki_db` schema and the standalone-RBAC rationale.

## Responsibilities

**Content (Phase 1 — articles + revisions).** `GET/POST /api/v1/wiki/articles`, `GET/PUT /api/v1/wiki/articles/:slug`, `GET /api/v1/wiki/articles/:slug/revisions`, `GET /api/v1/wiki/articles/:slug/revisions/:revisionId`. Reads are public (no `requireAuth`); creating and editing require only a valid platform login — see "Editing model" below for why there's no extra role gate in Phase 1. Article content is Markdown, rendered client-side. Every edit appends a new immutable `Revision` row rather than overwriting content in place, so the full edit history is always available; "the current version" is simply the most recent revision for an article.

**Governance.** Manages this module's role catalog (`GET/POST /api/v1/wiki/roles`, `DELETE /api/v1/wiki/roles/:id`) and per-member role assignment within the module (`GET/POST /api/v1/wiki/members/:userId/roles`, `DELETE /api/v1/wiki/members/:userId/roles/:roleName`). It does not store user profiles, credentials, passwords, or tokens, and it never calls `user-service` or `auth-service` over HTTP — authorization is resolved entirely from this service's own `wiki_db`, trusting only the JWT for the caller's identity (`userId`, `email`).

This service never issues JWTs; it only verifies access tokens issued by `auth-service`, using the same `JWT_ACCESS_SECRET`.

## Editing model (Phase 1)

Any authenticated platform account can create and edit articles — there is no separate "become an editor" step, matching real Wikipedia's UX, and `REGISTERED_EDITOR` is treated as synonymous with "logged in." This deliberately sidesteps a platform-wide gap: module-local roles like `BUREAUCRAT` are assigned only in this service's own `wiki_db` and never make it into the JWT `roles` claim (nothing consumes the `user.role_assigned` event to update it), so `requireRoles('BUREAUCRAT')` can today only ever be satisfied by the platform-wide `ADMIN` override. That gap doesn't block Phase 1 since article read/write only needs `requireAuth`, but it will need a live-DB-lookup middleware (reading this service's own `userRoleRepo` directly, keeping the service standalone) before Phase 2's moderation actions (page delete/restore, blocks, protection, role promotion) can be correctly gated for a non-`ADMIN` `BUREAUCRAT`/`ADMINISTRATOR`.

## Content model

`Article` rows hold only metadata (`title`, `slug`, `createdBy`, timestamps) — no content column. All content lives on `Revision` rows (`articleId`, `content`, `editSummary`, `editorUserId`, `createdAt`), and edits always `INSERT` a new revision rather than `UPDATE` an existing one. Slugs are generated from the title (`slugify()` — lowercased, diacritics stripped, non-alphanumeric collapsed to hyphens) with a uniqueness loop appending `-2`, `-3`, ... on collision; Phase 1 has no page-move/rename support, so a slug is fixed once an article is created.

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
