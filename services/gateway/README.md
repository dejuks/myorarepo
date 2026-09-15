# ORA Platform — API Gateway

The single entry point for every client (web/mobile) and the only service exposed publicly besides Nginx. Owns routing, API versioning, rate limiting, request filtering, and edge-level JWT verification. Holds no database and no business logic — see `docs/01-architecture.md` (platform monorepo root) §2/§3.

## What it does

Routes `/api/v1/<prefix>/*` requests to the matching downstream service per `src/config/service-registry.ts` (the full 12-service table from the architecture doc, with not-yet-built services returning `503` instead of a dangling proxy target). Applies a global rate limit plus a stricter one on `/api/v1/auth/*`. Verifies the access token's signature and expiry for routes marked `requiresAuth` before proxying — not a full check (no blacklist, no roles), so every downstream service still performs its own complete verification; this is defense in depth, not a single trust boundary. Assigns/propagates an `x-correlation-id` header on every request for end-to-end tracing across the proxied hop. Aggregates downstream `/health` checks at `GET /health/ready`.

TLS termination happens at the Nginx container in front of this service (`nginx/nginx.conf`), not in this Express app.

## Quick start

```bash
cp .env.example .env      # point *_SERVICE_URL vars at running services
npm install
npm run dev                # http://localhost:8080
```

Or with Docker (requires the `ora-network` external network and auth-service/user-service already running on it):

```bash
docker network create ora-network   # once, if it doesn't exist yet
docker compose up --build
```

## Testing

```bash
npm test
```

Covers the service registry's path matching, the edge JWT-verification middleware (valid/expired/malformed/missing tokens, public overrides), and app-level behavior for health, unimplemented routes (503), and unknown routes (404).

## Adding a new service

Add one line to `serviceRoutes` in `src/config/service-registry.ts` with `implemented: true` and the service's base URL env var, then add that env var to `.env.example` and `docker-compose.yml`. No other gateway code changes.
