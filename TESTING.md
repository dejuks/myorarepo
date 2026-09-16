# Running and testing the platform locally

This brings up everything built so far (auth-service, user-service, notification-service, search-service, and the gateway in front of them) with one command, using `infra/docker-compose.yml`.

## Prerequisites

Docker Desktop installed and running. Nothing else — no local Node/Postgres install needed.

## 1. Start the stack

From the repo root:

```
cd infra
docker compose up --build
```

First run takes a few minutes (pulling Postgres/Redis/RabbitMQ images and building 4 service images). Leave this running in its own terminal; add `-d` instead if you want it in the background.

## 2. Run database migrations (one-time, after first startup)

Each service owns its own database and migrations, run once the containers are healthy:

```
docker compose exec auth-service npm run migrate:prod
docker compose exec user-service npm run migrate:prod
docker compose exec notification-service npm run migrate:prod
docker compose exec search-service npm run migrate:prod
```

You only need to re-run a service's migration after you pull a change that adds a new migration file.

## 3. Test on the interface

Everything is now reachable in your browser:

| What | URL |
|---|---|
| Gateway health (aggregates all services) | http://localhost:8080/health/ready |
| Auth Service Swagger UI | http://localhost:4001/api-docs |
| User Service Swagger UI | http://localhost:4002/api-docs |
| Notification Service Swagger UI | http://localhost:4009/api-docs |
| Search Service Swagger UI | http://localhost:4010/api-docs |
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

`search-service` (`docs/01-architecture.md` §3) never originates data — it only indexes what it hears from `journal-service`, `ebook-service`, `library-service`, `repository-service`, `wiki-service`, and `researcher-service` over RabbitMQ. None of those six services exist yet in this monorepo, so its index starts empty and stays empty for now. It's fine — expected, not a bug — to spot check `GET http://localhost:4010/api-docs` and try `GET /search`, which should return a `200` with an empty paginated result: `{ "success": true, "data": [], "meta": { "total": 0, "page": 1, "pageSize": 20 } }`. Once each content service is built and starts publishing `*.published`/`*.updated`/`*.deleted` events on its own exchange, `search-service` will begin populating its index automatically, with no changes to `search-service` itself.

### Going through the gateway instead

Every one of the calls above also works prefixed with the gateway's port instead of a service's own port — e.g. `POST http://localhost:8080/api/v1/auth/login` — which is what a real frontend would call. The gateway forwards it to auth-service and adds the edge-level checks (rate limiting, JWT pre-check).

## 4. Shut down

```
docker compose down          # stop containers, keep data
docker compose down -v       # stop containers AND wipe the databases
```

## Troubleshooting

**"Cannot find module '@config/env'" or similar** — this was a real bug in earlier builds (path aliases weren't rewritten for the compiled output) and is fixed as of this patch. If you still see it, you're running an image built before the fix — run `docker compose up --build` again to force a rebuild.

**A service's Swagger shows but every call 401s** — you didn't click "Authorize" in that service's own Swagger UI, or the token expired (15 minutes) — log in again via auth-service to get a fresh one.

**`docker compose exec ... migrate:prod` fails with ECONNREFUSED** — the service or its database isn't healthy yet; wait a few seconds after `docker compose up` finishes pulling/building, or check `docker compose ps`.
