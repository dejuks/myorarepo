# ORA Platform — Wiki Service

Owns the Oromo Wikipedia content layer (articles + full revision history) and roles/role assignments for content moderation and governance — fully standalone: it never calls another service over HTTP, per the platform's per-module-RBAC pattern. See `docs/erd.md` for the `wiki_db` schema and the standalone-RBAC rationale.

## Responsibilities

**Content (Phase 1 — articles + revisions).** `GET/POST /api/v1/wiki/articles`, `GET/PUT /api/v1/wiki/articles/:slug`, `GET /api/v1/wiki/articles/:slug/revisions`, `GET /api/v1/wiki/articles/:slug/revisions/:revisionId`. Reads are public (`optionalAuth`, not `requireAuth` — see "Article visibility" below); creating and editing require a valid platform login AND at least the `REGISTERED_EDITOR` wiki role — see "Editing model" below. Article content is Markdown, rendered client-side. Every edit appends a new immutable `Revision` row rather than overwriting content in place, so the full edit history is always available; "the current version" is simply the most recent revision for an article.

**Metadata, categories, tags & search (Phase 2).** Articles also carry `summary`, `language`, `categoryId`, `featuredImageUrl`, and free-form `tagNames` (spec section "2. Article Management"). `GET/POST /api/v1/wiki/categories`, `DELETE /api/v1/wiki/categories/:id` — hierarchical via a self-referencing `parentCategoryId` (spec section 4); deleting a category with children is blocked, deleting one still referenced by articles is allowed (those articles simply become uncategorized). `GET/POST /api/v1/wiki/tags`, `DELETE /api/v1/wiki/tags/:id` — free-form, unique per `(name, language)`, created on the fly by any editor when saving an article (spec section 5). `GET /api/v1/wiki/articles` supports `search` (Postgres full-text search over title+summary via a generated `search_vector` tsvector column, `plainto_tsquery`), plus `language`, `categoryId`, `tagId`, `authorId`, `status`, `from`/`to` filters (spec section 11's "Advanced Search") — all resolved entirely within `wiki_db`, keeping the module standalone.

**Review & approval workflow (Phase 2, spec section 8).** `POST /api/v1/wiki/articles/:slug/submit` (author or moderator, `DRAFT`/`REJECTED` → `SUBMITTED`), `POST /api/v1/wiki/articles/:slug/review/start` (moderator only, `SUBMITTED` → `UNDER_REVIEW`), `POST /api/v1/wiki/articles/:slug/review` (moderator only, records an `ArticleReview` row and moves to `APPROVED`/`REJECTED`/`DRAFT` per the decision), `POST /api/v1/wiki/articles/:slug/publish` (moderator only, `APPROVED` → `PUBLISHED`), `POST /api/v1/wiki/articles/:slug/archive` (moderator only, `PUBLISHED` → `ARCHIVED`), `GET /api/v1/wiki/articles/:slug/reviews` (any logged-in user — the full audit trail). "Moderator" here means a live `ADMINISTRATOR`/`BUREAUCRAT` role in `wiki_db`, or the platform-wide `ADMIN` override — see "The JWT-roles gap, resolved" below. Invalid transitions (e.g. publishing a `DRAFT`) return 409.

### Article visibility

Anonymous/public readers only ever see `PUBLISHED` articles. A logged-in author always sees their own article regardless of status (so their drafts and in-review work are visible to them, nowhere else). A moderator sees everything. This is why article reads use `optionalAuth` rather than `requireAuth` — the endpoints stay public, but when a token is present the service still knows who's asking.

### The JWT-roles gap, resolved

Phase 1's README noted a deferred gap: module-local roles like `BUREAUCRAT` never appear in the JWT `roles` claim (only synced at login from `auth-service`, which starts everyone at `['USER']`), so `requireRoles('BUREAUCRAT')` could only ever be satisfied by the platform-wide `ADMIN` override. Phase 2's moderation actions are the first endpoints that actually need a real, non-`ADMIN` `ADMINISTRATOR`/`BUREAUCRAT` to be able to act, so this is where it got fixed: `requireModuleRole(userRoleRepo, ...allowedRoles)` in `auth.middleware.ts` checks the JWT `ADMIN` override first (no DB call, short-circuits), then falls back to a live query against this service's own `UserRoleAssignmentRepository` — still fully standalone, no cross-service call.

**Governance.** Manages this module's role catalog (`GET/POST /api/v1/wiki/roles`, `DELETE /api/v1/wiki/roles/:id`) and per-member role assignment within the module (`GET/POST /api/v1/wiki/members/:userId/roles`, `DELETE /api/v1/wiki/members/:userId/roles/:roleName`). It does not store user profiles, credentials, passwords, or tokens, and it never calls `user-service` or `auth-service` over HTTP — authorization is resolved entirely from this service's own `wiki_db`, trusting only the JWT for the caller's identity (`userId`, `email`).

This service never issues JWTs; it only verifies access tokens issued by `auth-service`, using the same `JWT_ACCESS_SECRET`.

## Editing model

Creating or editing an article requires the caller to hold at least the `REGISTERED_EDITOR` wiki role in `wiki_db` (or `ADMINISTRATOR`/`BUREAUCRAT`/`OVERSIGHTER`, all of which are supersets of it — or the platform-wide `ADMIN` override). A plain authenticated account with no wiki role assignment can read and browse the wiki but gets a 403 on `POST /articles` and `PUT /articles/:slug`. This is enforced with the same `requireModuleRole(userRoleRepo, ...)` gate used for the review/publish/archive actions (see "The JWT-roles gap, resolved" above) — `requireEditor` in `article.routes.ts` — so becoming a Registered Editor (via `POST /api/v1/wiki/members/:userId/roles`, granted by a module admin) is a real, separate step, not synonymous with just being logged in.

## Content model

`Article` rows hold metadata (`title`, `slug`, `summary`, `language`, `categoryId`, `featuredImageUrl`, `status`, `publishedAt`, `createdBy`, timestamps) plus a generated `search_vector` tsvector column — no article-content column. All body content lives on `Revision` rows (`articleId`, `content`, `editSummary`, `editorUserId`, `createdAt`), and edits always `INSERT` a new revision rather than `UPDATE` an existing one. Slugs are generated from the title (`slugify()` — lowercased, diacritics stripped, non-alphanumeric collapsed to hyphens) with a uniqueness loop appending `-2`, `-3`, ... on collision; there's still no page-move/rename support, so a slug is fixed once an article is created.

Tags attach via a raw `article_tags` join table (no TypeORM relation — managed by hand in `ArticleRepository.setTags()`, consistent with this codebase's existing hand-rolled join style). Categories are hierarchical via a self-referencing `parentCategoryId`. `status` follows a fixed state machine: `DRAFT → SUBMITTED → UNDER_REVIEW → {APPROVED|REJECTED|DRAFT} → PUBLISHED → ARCHIVED`, plus `REJECTED → SUBMITTED` for resubmission; enforced server-side, invalid transitions return 409.

## Deferred (spec sections not yet built)

Full Multilingual Management (dedicated `Language`/`Translation` entities and translation workflow — `language` today is just a plain code column on Article/Category/Tag), References & Citations, Discussion/Talk Pages, a real file-based Media Library (an image upload wired to the `ora-wiki-media` MinIO bucket — `featuredImageUrl` today is just a validated URL string), and Notifications (likely an async RabbitMQ integration with the platform-wide `notification-service` rather than a new in-module entity, to preserve this service's standalone constraint).

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
