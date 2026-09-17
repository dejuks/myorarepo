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

Log in at http://localhost:3000/login with the credentials above to reach the admin-only pages: `/admin/users` (search/manage all users), `/admin/roles` (platform-wide role catalog — click the key icon on any role to open that role's permission editor, a grouped-checkbox view styled after GitHub's OAuth "Select scopes" screen; ADMIN starts with every permission checked), and `/admin/modules/<key>` for each content module's own roles/permissions dashboard (`journal`, `ebook`, `library`, `wiki`, `repository`, `researcher` — also linked from the sidebar under "Module roles"). A quick way to see the permission edit take effect immediately: uncheck `users.view` on `ADMIN`, save, then reload `/admin/users` as the super-admin — it 403s right away, no logout/login needed; re-check it and it works again on the next request. See `services/user-service/README.md` "Role-based permissions" for the full permission list and which endpoints each one gates.

`/profile` also has a few extra optional fields now — gender, date of birth, address, city, region, country, and timezone — under an "Additional details" divider when editing; they're blank until filled in and never required. On a user's detail page (`/admin/users/:id`), the "Add role" control has an optional "Expires on" date next to the role picker: leave it blank for a permanent grant, or pick a date for a temporary one — the role simply stops appearing in that user's role list (and stops granting its permissions) once the date passes, no manual revoke needed.

### 2b. Email verification is a runtime toggle, off by default

Whether a new account (self-registered or admin-created) has to click an emailed verification link before it can log in is a **platform-wide setting**, not a fixed behavior — see `docs/01-architecture.md` "Email verification". It ships **off** by default, so a fresh `docker compose up` lets you register and immediately log in with no extra steps.

To turn it on — recommended before you do anything resembling a production test, and required if you want to exercise the actual verification flow described in "A realistic end-to-end flow to try" and "Using the web frontend instead of Swagger" below — log in as the super-admin (§2a above), open **Administration → Settings** in the sidebar, and flip "Require email verification for new accounts". It applies immediately, to every user, with no restart. You can flip it back off the same way at any time. (There's also `REQUIRE_EMAIL_VERIFICATION` in `infra/docker-compose.yml`/`.env`, but that only sets the *initial* value on a completely fresh database — once the stack has booted once, only the Settings toggle has any effect.)

The walkthroughs below assume verification is **off** (the default) unless a step says otherwise.

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
3. **With verification off (the default — §2b above), skip straight to step 5** — the account is already `ACTIVE` and logs in immediately. If you've turned verification **on** via Admin → Settings, login instead fails with a 403 ("Please verify your email before logging in...") until you verify — check the **notification-service** logs (`docker compose logs -f notification-service`) for the `EMAIL_VERIFICATION_REQUESTED` entry the console email provider logged — its `body` field contains the full verification URL, e.g. `http://localhost:3000/verify-email?token=<rawToken>`. Copy the `token` query-param value.
4. (Only if verification is on) In auth-service Swagger, call `POST /auth/verify-email` with `{ "token": "<rawToken>" }`. This flips the account to `ACTIVE` and is what auto-activates the matching `user-service` profile (via the `auth.email_verification.completed` event — with verification off, `register()` already did this itself).
5. Now call `POST /auth/login` with the same email/password — you'll get back an `accessToken`.
6. Copy that token, click the **Authorize** button (top right of Swagger UI) in user-service or notification-service, paste it as `Bearer <token>`, and try `GET /users/me` or `GET /notifications` — both now work as "you".
7. Check the **notification-service** logs again — you should see a "Welcome" email and an in-app notification triggered by `auth.registered`/`user.registered` at step 2, plus (if verification was on) an `EMAIL_VERIFICATION_COMPLETED` in-app notification from step 4.

You can also just log in as the pre-seeded super-admin from §2a above — that account is created `ACTIVE` directly, not through this flow, so it never needs verifying regardless of the setting.

### Search service — a derived store, populated only by events

`search-service` (`docs/01-architecture.md` §3) never originates data — it only indexes what it hears from `journal-service`, `ebook-service`, `library-service`, `repository-service`, `wiki-service`, and `researcher-service` over RabbitMQ. All six of those services now exist, but only as their standalone roles/permissions slice (§2a) — none of them publish content events yet (no manuscripts, books, catalog entries, wiki articles, deposits, or profiles to index), so the search index still starts empty and stays empty for now. It's fine — expected, not a bug — to spot check `GET http://localhost:4010/api-docs` and try `GET /search`, which should return a `200` with an empty paginated result: `{ "success": true, "data": [], "meta": { "total": 0, "page": 1, "pageSize": 20 } }`. Once each content service's business workflow is built and starts publishing `*.published`/`*.updated`/`*.deleted` events on its own exchange, `search-service` will begin populating its index automatically, with no changes to `search-service` itself.

### The six content modules — roles/permissions only, for now

Each of `journal-service` (`:4005`), `ebook-service` (`:4006`), `library-service` (`:4007`), `wiki-service` (`:4008`), `repository-service` (`:4004`), and `researcher-service` (`:4003`) currently exposes only its standalone RBAC slice: `GET /roles` (the module's role catalog), `GET/POST/DELETE` on `/members/:userId/roles` (list/assign/revoke a member's roles in that module), and `/health`/`/health/ready` — all under that service's own gateway prefix (e.g. `http://localhost:8080/api/v1/journals/roles`). Each module verifies the JWT locally and never calls another service to check permissions (see `docs/01-architecture.md` §2a for why). A quick check per module, using the token from step 5 above (or the pre-seeded super-admin's token, which already holds every module's top role):

```
GET http://localhost:8080/api/v1/journals/roles
Authorization: Bearer <accessToken>
```
should return the 5 seeded journal roles (`JOURNAL_MANAGER`, `EDITOR_IN_CHIEF`, `ASSOCIATE_EDITOR`, `REVIEWER`, `AUTHOR`) — and the same super-admin account already holds `JOURNAL_MANAGER` and `AUTHOR` there (and the equivalent top+base role pair in each of the other five modules) from the bootstrap seed, with no manual setup. Swap `/journals` for any other module's prefix from the table above to check its own catalog.

**Permission model within each module (updated):** creating/deleting a role in a module's catalog (`POST`/`DELETE /roles...`) now requires the platform-wide `ADMIN` role specifically — the module's own top role (e.g. `JOURNAL_MANAGER`) can no longer do this. Assigning/revoking an *existing* role to a member still works with either the module's own top role or platform `ADMIN` — a global `ADMIN` automatically passes every module's checks with no module-local role assignment needed. Since the platform super-admin bootstrap account (`SUPER_ADMIN_EMAIL`) already holds platform-wide `ADMIN` from `user-service`'s own bootstrap, every one of these calls with the super-admin token already exercises the ADMIN-override path, not just each module's local top role. See `docs/01-architecture.md` §2a ("Platform-wide ADMIN override...").

### Going through the gateway instead

Every one of the calls above also works prefixed with the gateway's port instead of a service's own port — e.g. `POST http://localhost:8080/api/v1/auth/login` — which is what a real frontend would call. The gateway forwards it to auth-service and adds the edge-level checks (rate limiting, JWT pre-check).

### Using the web frontend instead of Swagger

The `web/` app (React + TypeScript + MUI, built with Vite) is the real client for everything above. It's included in `infra/docker-compose.yml` (service `web`, built from `../web`), so `docker compose up --build` from `infra/` brings it up alongside everything else at **http://localhost:3000**. To run only the frontend against a backend that's already up, use `web/docker-compose.yml` instead (`cd web && docker compose up --build`).

The same end-to-end flow as above, but through the UI:

1. Open http://localhost:3000 — you'll land on `/login`, which redirects to `/register` if you follow the "Create one" link.
2. On **Register**, fill in first name, last name, email, and a password meeting the live policy hint (uppercase, lowercase, digit, special character, 8-72 chars), confirm it, and submit. This drives the same two-step flow as the manual Swagger steps above — `POST /users` in user-service, then `POST /auth/register` in auth-service, using one generated UUID for both — then redirects you to `/login`. With verification off (the default — §2b above), the account is already `ACTIVE` and step 3 doesn't apply. If you've turned verification on via Admin → Settings, the account is **not usable yet** and step 3 does apply.
3. (Only if verification is on) Verify the account: since there's no real mail server in dev, grab the link from the **notification-service** logs (`docker compose logs -f notification-service`) — find the `EMAIL_VERIFICATION_REQUESTED` entry and copy its `body`'s `http://localhost:3000/verify-email?token=...` URL, then open it in the browser. `/verify-email` submits the token automatically on load and shows a success message with a "Go to sign in" button (it also has its own inline "resend" form if the token is missing/expired — no need to redo step 2).
4. On **Login**, sign in with that email/password. If you try before verifying, the error alert includes a **"Resend verification email"** link that re-sends the same email without leaving the login page. Once verified, you're redirected to `/dashboard`.
5. The dashboard shell shows an `AppBar` (with a notifications bell and unread-count badge) and a `Drawer` with links to Dashboard, Profile, and Notifications. Signed in as an admin, two more sections appear: **Administration** (`/admin/users`, `/admin/roles`, `/admin/settings`) and **Module roles** — one link per content module (Journals, Ebooks, Library, Wiki, Repository, Researcher Network), each opening that module's own roles/permissions dashboard at `/admin/modules/<key>`. Signed in as a module admin who is *not* platform `ADMIN` (holds only that module's top role, e.g. `JOURNAL_MANAGER`), **Administration** is hidden but **Module roles** still shows — and only lists — the module(s) they hold the top role in; opening one of those directly by URL also works (`/admin/modules/journal`), while a module they don't manage redirects them to `/dashboard`.
6. The global **Users** page (`/admin/users`, super admin only) and every module dashboard both have a **Create user** button, opening the same shared dialog: first name, last name, email, password/confirm — no role or status picker, since role assignment stays a separate step after creation. It provisions a brand-new real platform account (same two-step flow as `/register`) and, on the module dashboard, immediately selects it so you can assign it a role there; on the global Users page, it navigates you to that user's detail page instead. Either way whether the new account needs verifying depends on the same platform-wide setting as self-registration (§2b, steps 2-3 above apply identically here) — a module admin can't override it for one account. There's also a fifth item under **Administration**, **Settings**, where the super-admin flips that platform-wide toggle (see §2b) — only they can reach it. Each module dashboard also has a role-catalog panel (create/delete a role — platform `ADMIN` only) and a member-roles panel (search any platform user, see their roles in that specific module, and assign/revoke them — the module's own top role or platform `ADMIN`). These are standalone per module (see `docs/01-architecture.md` §2a) — assigning a role in one module has no effect on any other module or on the platform-wide roles in `/admin/roles`. There's still no content-management UI (no manuscript submission, cataloging, etc.) — only roles/permissions — since those business workflows aren't built yet.
7. **Profile** (`/profile`) shows your real `GET /users/me` fields, with a small "Edit name" form wired to `PATCH /users/:id`.
8. **Notifications** (`/notifications`) lists `GET /notifications` (the welcome and verification notifications from steps 2-3 above), with "mark all read" and per-item mark-read actions.
9. Refreshing the page keeps you logged in — the frontend persists only the refresh token (not the access token) to `localStorage` and silently calls `/auth/refresh` on load. Logging out (via the account menu) calls `POST /auth/logout` and clears local state.

## 4. Shut down

```
docker compose down          # stop containers, keep data
docker compose down -v       # stop containers AND wipe the databases
```

## Troubleshooting

**"Cannot find module '@config/env'" or similar** — this was a real bug in earlier builds (path aliases weren't rewritten for the compiled output) and is fixed as of this patch. If you still see it, you're running an image built before the fix — run `docker compose up --build` again to force a rebuild.

**A service's Swagger shows but every call 401s** — you didn't click "Authorize" in that service's own Swagger UI, or the token expired (15 minutes) — log in again via auth-service to get a fresh one.

**`docker compose exec ... migrate:prod` fails with ECONNREFUSED** — the service or its database isn't healthy yet; wait a few seconds after `docker compose up` finishes pulling/building, or check `docker compose ps`.
