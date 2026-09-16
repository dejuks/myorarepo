# Running and testing the platform locally

This brings up everything built so far — auth-service, user-service, notification-service, search-service, the six content-module services (journal, ebook, library, wiki, repository, researcher-network — each currently just its standalone roles/permissions slice, see `docs/01-architecture.md` §2a), and the gateway in front of all of them — with one command, using `infra/docker-compose.yml`.

## Prerequisites

Docker Desktop installed and running. Nothing else — no local Node/Postgres install needed.

## 1. Start the stack

From the repo root:

```
cd infra
docker compose up --build
```

First run takes a few minutes (pulling Postgres/Redis/RabbitMQ images and building 10 service images, plus the web frontend). Leave this running in its own terminal; add `-d` instead if you want it in the background.

## 2. Run database migrations (one-time, after first startup)

Each service owns its own database and migrations, run once the containers are healthy:

```
docker compose exec auth-service npm run migrate:prod
docker compose exec user-service npm run migrate:prod
docker compose exec notification-service npm run migrate:prod
docker compose exec search-service npm run migrate:prod
docker compose exec journal-service npm run migrate:prod
docker compose exec ebook-service npm run migrate:prod
docker compose exec library-service npm run migrate:prod
docker compose exec wiki-service npm run migrate:prod
docker compose exec repository-service npm run migrate:prod
docker compose exec researcher-service npm run migrate:prod
```

You only need to re-run a service's migration after you pull a change that adds a new migration file.

## 2a. Log in as the built-in super-admin (no manual setup needed)

`infra/docker-compose.yml` sets default `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` values, so as soon as `auth-service` and `user-service` finish their first boot (after step 1, before or after running migrations — it re-checks on every restart and is a no-op once seeded) you already have an admin account:

```
email:    admin@ora.local
password: ChangeMe123!
```

This account is created directly in each service's database at startup (not through the public API), is assigned both `USER` and `ADMIN` roles in user-service, and has a matching login credential in auth-service — the two services independently derive the same user id for this email via a deterministic UUID, so no coordination between them is needed. It's idempotent: safe to leave the env vars set permanently, restart the stack as often as you like, and it will never create a duplicate or reset anything once it exists.

The same `SUPER_ADMIN_EMAIL` also becomes the top local role in every content module (Journal Manager, Book Editor, Library Manager, Bureaucrat, Repository Administrator, Platform Administrator — see the table in `docs/01-architecture.md` §2a), independently seeded the same idempotent way in each of those six services. This account can therefore manage roles everywhere out of the box, without any manual role-assignment step.

Log in at http://localhost:3000/login with the credentials above to reach the admin-only pages: `/admin/users` (search/manage all users), `/admin/roles` (platform-wide roles reference), and `/admin/modules/<key>` for each content module's own roles/permissions dashboard (`journal`, `ebook`, `library`, `wiki`, `repository`, `researcher` — also linked from the sidebar under "Module roles").

**Change `SUPER_ADMIN_PASSWORD` (and ideally `SUPER_ADMIN_EMAIL`) before running this anywhere beyond your own machine** — set them in a `.env` file next to `infra/docker-compose.yml` (Compose picks it up automatically) rather than editing the compose file itself. Setting `SUPER_ADMIN_EMAIL` blank disables the seed entirely for a given service.

## 3. Test on the interface

Everything is now reachable in your browser:

| What | URL |
|---|---|
| Web frontend (login / register / dashboard) | http://localhost:3000 |
| Gateway health (aggregates all services) | http://localhost:8080/health/ready |
| Auth Service Swagger UI | http://localhost:4001/api-docs |
| User Service Swagger UI | http://localhost:4002/api-docs |
| Notification Service Swagger UI | http://localhost:4009/api-docs |
| Search Service Swagger UI | http://localhost:4010/api-docs |
| Researcher Network Service Swagger UI | http://localhost:4003/api-docs |
| Repository Service Swagger UI | http://localhost:4004/api-docs |
| Journal Service Swagger UI | http://localhost:4005/api-docs |
| Ebook Service Swagger UI | http://localhost:4006/api-docs |
| Library Service Swagger UI | http://localhost:4007/api-docs |
| Wiki Service Swagger UI | http://localhost:4008/api-docs |
| RabbitMQ management UI (guest/guest) | http://localhost:15672 |

Swagger UI is fully interactive — click "Try it out" on any endpoint, fill in the body, and execute it right from the browser. This is the fastest way to test without Postman.

### A realistic end-to-end flow to try

1. In **user-service** Swagger (`:4002/api-docs`), call `POST /users` with a body like:
   ```json
   { "id": "11111111-1111-4111-8111-111111111111", "email": "test@example.com", "firstName": "Test", "lastName": "User" }
   ```
2. In **auth-service** Swagger (`:4001/api-docs`), call `POST /auth/register` with the **same id** as `userId`:
   ```json
   { "userId": "11111111-1111-4111-8111-111111111111", "email": "test@example.com", "password": "StrongPass1!" }
   ```
3. Still in auth-service, call `POST /auth/login` with the same email/password — you'll get back an `accessToken`.
4. Copy that token, click the **Authorize** button (top right of Swagger UI) in user-service or notification-service, paste it as `Bearer <token>`, and try `GET /users/me` or `GET /notifications` — both now work as "you".
5. Check the **notification-service** logs (`docker compose logs -f notification-service`) — you should see it logged a "Welcome" email (via the console email provider) and an in-app notification, both triggered automatically by the `auth.registered` and `user.registered` events you just caused.

### Search service — a derived store, populated only by events

`search-service` (`docs/01-architecture.md` §3) never originates data — it only indexes what it hears from `journal-service`, `ebook-service`, `library-service`, `repository-service`, `wiki-service`, and `researcher-service` over RabbitMQ. All six of those services now exist, but only as their standalone roles/permissions slice (§2a) — none of them publish content events yet (no manuscripts, books, catalog entries, wiki articles, deposits, or profiles to index), so the search index still starts empty and stays empty for now. It's fine — expected, not a bug — to spot check `GET http://localhost:4010/api-docs` and try `GET /search`, which should return a `200` with an empty paginated result: `{ "success": true, "data": [], "meta": { "total": 0, "page": 1, "pageSize": 20 } }`. Once each content service's business workflow is built and starts publishing `*.published`/`*.updated`/`*.deleted` events on its own exchange, `search-service` will begin populating its index automatically, with no changes to `search-service` itself.

### The six content modules — roles/permissions only, for now

Each of `journal-service` (`:4005`), `ebook-service` (`:4006`), `library-service` (`:4007`), `wiki-service` (`:4008`), `repository-service` (`:4004`), and `researcher-service` (`:4003`) currently exposes only its standalone RBAC slice: `GET /roles` (the module's role catalog), `GET/POST/DELETE` on `/members/:userId/roles` (list/assign/revoke a member's roles in that module), and `/health`/`/health/ready` — all under that service's own gateway prefix (e.g. `http://localhost:8080/api/v1/journals/roles`). Each module verifies the JWT locally and never calls another service to check permissions (see `docs/01-architecture.md` §2a for why). A quick check per module, using the super-admin token from step 3 above:

```
GET http://localhost:8080/api/v1/journals/roles
Authorization: Bearer <accessToken>
```
should return the 5 seeded journal roles (`JOURNAL_MANAGER`, `EDITOR_IN_CHIEF`, `ASSOCIATE_EDITOR`, `REVIEWER`, `AUTHOR`) — and the same super-admin account already holds `JOURNAL_MANAGER` and `AUTHOR` there (and the equivalent top+base role pair in each of the other five modules) from the bootstrap seed, with no manual setup. Swap `/journals` for any other module's prefix from the table above to check its own catalog.

### Going through the gateway instead

Every one of the calls above also works prefixed with the gateway's port instead of a service's own port — e.g. `POST http://localhost:8080/api/v1/auth/login` — which is what a real frontend would call. The gateway forwards it to auth-service and adds the edge-level checks (rate limiting, JWT pre-check).

### Using the web frontend instead of Swagger

The `web/` app (React + TypeScript + MUI, built with Vite) is the real client for everything above. It's included in `infra/docker-compose.yml` (service `web`, built from `../web`), so `docker compose up --build` from `infra/` brings it up alongside everything else at **http://localhost:3000**. To run only the frontend against a backend that's already up, use `web/docker-compose.yml` instead (`cd web && docker compose up --build`).

The same end-to-end flow as above, but through the UI:

1. Open http://localhost:3000 — you'll land on `/login`, which redirects to `/register` if you follow the "Create one" link.
2. On **Register**, fill in first name, last name, email, and a password meeting the live policy hint (uppercase, lowercase, digit, special character, 8-72 chars), confirm it, and submit. This drives the same two-step flow as the manual Swagger steps above — `POST /users` in user-service, then `POST /auth/register` in auth-service, using one generated UUID for both — then redirects you to `/login` with a success message.
3. On **Login**, sign in with that email/password. You're redirected to `/dashboard`.
4. The dashboard shell shows an `AppBar` (with a notifications bell and unread-count badge) and a `Drawer` with links to Dashboard, Profile, and Notifications. Signed in as an admin, two more sections appear: **Administration** (`/admin/users`, `/admin/roles`) and **Module roles** — one link per content module (Journals, Ebooks, Library, Wiki, Repository, Researcher Network), each opening that module's own roles/permissions dashboard at `/admin/modules/<key>`. Each dashboard has two panels: the module's role catalog (create/delete custom roles) and a member-roles panel — search any platform user, see their roles in that specific module, and assign/revoke them. These are standalone per module (see `docs/01-architecture.md` §2a) — assigning a role in one module has no effect on any other module or on the platform-wide roles in `/admin/roles`. There's still no content-management UI (no manuscript submission, cataloging, etc.) — only roles/permissions — since those business workflows aren't built yet.
5. **Profile** (`/profile`) shows your real `GET /users/me` fields, with a small "Edit name" form wired to `PATCH /users/:id`.
6. **Notifications** (`/notifications`) lists `GET /notifications` (the same welcome notifications from step 5 of the Swagger flow above), with "mark all read" and per-item mark-read actions.
7. Refreshing the page keeps you logged in — the frontend persists only the refresh token (not the access token) to `localStorage` and silently calls `/auth/refresh` on load. Logging out (via the account menu) calls `POST /auth/logout` and clears local state.

## 4. Shut down

```
docker compose down          # stop containers, keep data
docker compose down -v       # stop containers AND wipe the databases
```

## Troubleshooting

**"Cannot find module '@config/env'" or similar** — this was a real bug in earlier builds (path aliases weren't rewritten for the compiled output) and is fixed as of this patch. If you still see it, you're running an image built before the fix — run `docker compose up --build` again to force a rebuild.

**A service's Swagger shows but every call 401s** — you didn't click "Authorize" in that service's own Swagger UI, or the token expired (15 minutes) — log in again via auth-service to get a fresh one.

**`docker compose exec ... migrate:prod` fails with ECONNREFUSED** — the service or its database isn't healthy yet; wait a few seconds after `docker compose up` finishes pulling/building, or check `docker compose ps`.
