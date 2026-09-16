# ORA Digital Platform — Phase 1: System Architecture

## 1. Overview

ORA Platform is a production-grade, microservice-based digital publishing and knowledge platform covering journals, ebooks, a digital library/repository, a researcher network, and the Oromo Wikipedia. It follows a database-per-service microservices architecture, communicates synchronously over REST through a single API gateway and asynchronously over RabbitMQ for cross-service events, and is containerized end-to-end with Docker and Docker Compose (with a documented path to Kubernetes for production scale).

This document defines service boundaries, database boundaries, the event-driven communication model, the RabbitMQ/Redis/MinIO architecture, the monorepo folder and Git structure, the environment strategy, and the deployment strategy. Phase 2 (delivered next, and separately for every subsequent service) builds the Authentication Service in full against these boundaries.

## 2. Service Inventory

Twelve services make up the platform. Each owns exactly one PostgreSQL database, is independently deployable, and exposes only REST APIs behind the gateway — no service reaches into another service's database.

| # | Service | Codename | Database | Primary Responsibility |
|---|---|---|---|---|
| 1 | API Gateway | `gateway` | none (stateless) | TLS termination, routing, rate limiting, request filtering, API versioning |
| 2 | Authentication Service | `auth-service` | `auth_db` | Login, token issuance/refresh, password reset, MFA, session/token revocation |
| 3 | User Management Service | `user-service` | `user_db` | User profiles, roles, permissions, account lifecycle |
| 4 | Researcher Network Service | `researcher-service` | `researcher_db` | Researcher profiles, collaboration, following, endorsements |
| 5 | Repository Management Service | `repository-service` | `repository_db` | Institutional repository deposits, metadata, OAI-PMH/Z39.50 exposure |
| 6 | Journal Management Service | `journal-service` | `journal_db` | Submission, peer review, editorial workflow, publishing |
| 7 | Ebook Management Service | `ebook-service` | `ebook_db` | Ebook catalog, publishing, DRM metadata, downloads |
| 8 | Digital Library Service | `library-service` | `library_db` | Cataloguing, circulation, holds, physical + digital lending |
| 9 | Oromo Wikipedia Service | `wiki-service` | `wiki_db` | Wiki articles, revisions, talk pages, moderation |
| 10 | Notification Service | `notification-service` | `notification_db` | Email/SMS/push/in-app notifications, templates, delivery log |
| 11 | Search Service | `search-service` | `search_db` (+ index) | Cross-domain search indexing and querying (Postgres full-text or OpenSearch) |
| 12 | Monitoring Service | `monitoring-service` | `monitoring_db` (optional) | Health aggregation, metrics, alerting, audit trail |

Every service additionally satisfies the same cross-cutting contract: Clean Architecture layering, Repository Pattern, Service Layer Pattern, DTO validation (`class-validator`/`zod`), JWT authentication (via the shared `@ora/auth-client` package, not by re-implementing JWT logic), Docker support, REST + Swagger, unit tests (Jest), structured logging (`pino`/`winston`), and a `/health` and `/health/ready` endpoint.

### 2a. Standalone per-module RBAC (roles #4–#9)

Each content module (`researcher-service`, `repository-service`, `journal-service`, `ebook-service`, `library-service`, `wiki-service`) owns its **own** role catalog and its **own** user-to-role assignments, scoped entirely to that module — e.g. "Journal Manager" is a row in `journal_db`, not a role in `user_db`. This is a deliberate decoupling decision: a module service trusts the gateway-verified JWT for the caller's *identity* only (`userId`, `email` — same shared `JWT_ACCESS_SECRET` verification contract every service already implements) and makes **zero runtime calls** to `user-service` or `auth-service` to authorize anything. Module role catalogs come straight from this platform's SRS "User Classes" tables (one per module) and are seeded via migration, e.g.:

| Module | Roles (seeded, `is_system = true`) | Local "admin" role (manages this module's roles) |
|---|---|---|
| `journal-service` | JOURNAL_MANAGER, EDITOR_IN_CHIEF, ASSOCIATE_EDITOR, REVIEWER, AUTHOR | JOURNAL_MANAGER |
| `ebook-service` | BOOK_EDITOR, DIGITAL_CONTENT_MANAGER, FINANCE_OPERATIONS_OFFICER, AUTHOR_RESEARCHER | BOOK_EDITOR |
| `library-service` | LIBRARY_MANAGER, DIGITAL_LIBRARIAN, LIBRARIAN, CATALOGER, INVENTORY_MANAGER, MEMBER | LIBRARY_MANAGER |
| `wiki-service` | REGISTERED_EDITOR, ADMINISTRATOR, BUREAUCRAT, OVERSIGHTER | BUREAUCRAT |
| `repository-service` | RESEARCHER_AUTHOR, REPOSITORY_CURATOR, CONTENT_REVIEWER, REPOSITORY_ADMINISTRATOR | REPOSITORY_ADMINISTRATOR |
| `researcher-service` | RESEARCHER_MEMBER, GROUP_MODERATOR, EVENT_CONTENT_MANAGER, PLATFORM_ADMINISTRATOR | PLATFORM_ADMINISTRATOR |

The same chicken-and-egg problem `auth-service`/`user-service` solved for the platform-wide ADMIN role (see `services/auth-service/README.md`) recurs once per module: the very first person able to assign a module's roles needs one already assigned by someone. Each module solves it the same way — an idempotent, env-var-gated startup seed (`infrastructure/bootstrap/module-admin.bootstrap.ts`) that assigns the platform's `SUPER_ADMIN_EMAIL` account both the module's base role and its local "admin" role, using the same deterministic UUID v5 derivation (`common/utils/bootstrap-id.util.ts`, byte-identical across all eight services that have a copy) so it lands on the same `userId` as the platform-wide seed, with zero cross-service coordination.

What ships in this pass is the **authorization slice only** — role catalog, role assignment, and the `requireAuth`/`requireRoles`/`requireSelfOrRoles` middleware every future endpoint in that module builds on. The actual business workflows each module table above describes (manuscript submission, book proofing, circulation, wiki editing, deposits, networking) are still future work; each module service currently exposes only `/roles` and `/members/:userId/roles` under its gateway prefix, plus `/health` and `/health/ready`.

## 3. Service Boundaries — Design Rules

Boundaries follow domain-driven design: each service owns a single bounded context and is the sole writer of its data.

- **No shared database.** Services never query another service's schema directly, not even read-only. Cross-service data is obtained via REST call (synchronous, request-time) or via a locally-maintained read model populated from domain events (asynchronous, eventually consistent).
- **User identity vs. user profile split.** `auth-service` owns credentials, tokens, and login state only (who can authenticate). `user-service` owns the profile, role assignment, and account data (who this person is). This is a deliberate split so credential security auditing is isolated from general profile CRUD.
- **Reference by ID, not by join.** e.g., `journal-service` stores `authorUserId` (a UUID) referencing `user-service`; it does not store the author's name/email redundantly beyond a denormalized cache populated by the `UserProfileUpdated` event, used only for display.
- **Search is a derived store.** `search-service` never originates data; it subscribes to `*.Published`, `*.Updated`, `*.Deleted` events from every content service and maintains its own index. It is safe to rebuild by replaying events.
- **Gateway is boundary enforcement, not business logic.** Routing, auth-token verification (signature/expiry only), rate limiting, and request shaping live at the gateway; no domain logic does.

## 4. Database Boundaries

One PostgreSQL instance can host many logical databases in non-production environments; production uses one managed PostgreSQL instance (or cluster) per service for blast-radius isolation and independent scaling.

```
user_db            journal_db          ebook_db            library_db
wiki_db             repository_db       researcher_db       notification_db
search_db          monitoring_db       auth_db
```

Each service owns its migrations (via `node-pg-migrate` or `TypeORM` migrations) and its connection pool; nothing outside the service holds credentials to its database. Foreign keys never cross a database boundary — cross-service references are plain UUID columns with application-level integrity, reconciled by consuming domain events.

## 5. Event-Driven Communication Design

Two communication modes are used, deliberately:

**Synchronous (REST, via gateway or service-to-service over the internal network):** used when the caller needs an immediate, consistent answer — e.g., `auth-service` calling `user-service` to fetch role claims during login, or the gateway proxying a client request.

**Asynchronous (RabbitMQ, event/domain-events pattern):** used for anything that is "this happened, react if you care" — e.g., `UserRegistered`, `ArticlePublished`, `BookBorrowed`, `RepositoryItemDeposited`. Producers publish once; any number of consumers subscribe independently. This decouples services, absorbs load spikes, and lets `notification-service` and `search-service` stay in sync without the producer knowing they exist.

### 5.1 Event Catalog (representative, not exhaustive)

| Event | Producer | Consumers |
|---|---|---|
| `UserRegistered` | user-service | notification-service, search-service, researcher-service |
| `UserProfileUpdated` | user-service | journal-service, ebook-service, repository-service, search-service |
| `PasswordChanged` / `TokenRevoked` | auth-service | notification-service, monitoring-service |
| `ArticleSubmitted` / `ArticlePublished` | journal-service | notification-service, search-service, monitoring-service |
| `BookPublished` | ebook-service | search-service, notification-service |
| `BookBorrowed` / `BookReturned` | library-service | notification-service, user-service (limits) |
| `RepositoryItemDeposited` | repository-service | search-service, notification-service |
| `WikiArticleEdited` | wiki-service | search-service, notification-service |
| `ResearcherFollowed` | researcher-service | notification-service |

Every event is a versioned, immutable JSON envelope:

```json
{
  "eventId": "uuid",
  "eventType": "ArticlePublished",
  "eventVersion": 1,
  "occurredAt": "ISO-8601",
  "producer": "journal-service",
  "payload": { "...": "..." },
  "correlationId": "uuid"
}
```

## 6. RabbitMQ Architecture

- **Exchange type:** one topic exchange per domain, e.g. `ora.journal.events`, `ora.user.events`, `ora.library.events`, plus a shared `ora.notifications` fanout for anything that always needs to reach `notification-service`.
- **Routing keys:** `<entity>.<action>`, e.g. `article.published`, `book.borrowed`, `user.registered`.
- **Queues:** one durable queue per consumer service per exchange it subscribes to, named `<consumer>.<exchange>.q`, bound with the routing keys it cares about — so `notification-service` owns queues like `notification-service.journal-events.q`.
- **Dead-lettering:** every queue is declared with `x-dead-letter-exchange` pointing at a per-service `.dlx`; failed messages (after N retries, via a retry-count header) land in the DLQ for replay/inspection rather than being lost or endlessly redelivered.
- **Delivery guarantee:** publisher confirms are enabled; consumers use manual ack after successful processing (at-least-once delivery), so handlers are written idempotently (keyed on `eventId`).
- **Command queues (RPC-style, used sparingly):** direct queues for the rare case a service must ask another to do something long-running asynchronously, distinct from the pub/sub event queues above.

## 7. Redis Architecture

Redis is used for three distinct purposes, on logically separate databases/key prefixes (or separate Redis instances in production):

1. **Session/token support** (`auth-service`): refresh-token allow-list / JWT blacklist (`auth:blacklist:<jti>`), rate-limiting counters for login attempts (`auth:ratelimit:<ip|userId>`).
2. **Caching** (all services): read-through cache for expensive or hot reads, e.g. `user:profile:<id>`, `search:query:<hash>`, with short TTLs and explicit invalidation on the relevant domain event.
3. **API Gateway rate limiting and request de-duplication:** a shared `gateway:ratelimit:<clientKey>` sliding-window counter.

## 8. MinIO (Object Storage) Architecture

MinIO stands in for Ethio Telecom Cloud object storage locally and in staging, with an S3-compatible client so production can point at any S3-compatible provider without code changes.

- **Buckets, one per content domain:** `ora-manuscripts`, `ora-ebooks`, `ora-repository-files`, `ora-wiki-media`, `ora-avatars`, `ora-generated-pdfs`.
- **Access pattern:** services never expose MinIO credentials to the browser. A service generates a pre-signed upload/download URL (short TTL) on request; the client uploads/downloads directly to/from MinIO using that URL.
- **Metadata split:** the binary lives in MinIO; `file_id`, `object_key`, `bucket`, `mime_type`, `file_size`, `checksum`, `uploaded_by`, `created_at` live in the owning service's PostgreSQL database (per the platform-wide File Metadata convention shown in the architecture diagram).

## 9. Folder Structure (per service)

Every service follows the same Clean Architecture layout, so a developer who has worked in one service can navigate any other immediately:

```
service-name/
├── src/
│   ├── api/
│   │   ├── controllers/        # HTTP request/response only, no business logic
│   │   ├── routes/             # Express route definitions
│   │   ├── middleware/         # auth, error handler, request logger, validation
│   │   └── validators/         # DTO schemas (class-validator or zod)
│   ├── application/
│   │   ├── services/           # business/use-case logic (Service Layer)
│   │   └── dto/                # request/response DTOs
│   ├── domain/
│   │   ├── entities/           # core domain models, framework-agnostic
│   │   └── repositories/       # repository INTERFACES (ports)
│   ├── infrastructure/
│   │   ├── database/           # TypeORM/Prisma config, migrations, seeders
│   │   ├── repositories/       # repository IMPLEMENTATIONS (adapters)
│   │   ├── messaging/          # RabbitMQ publisher/consumer setup
│   │   ├── cache/               # Redis client wrapper
│   │   └── storage/             # MinIO client wrapper
│   ├── config/                  # env loading & validation, swagger config
│   ├── common/                  # shared errors, logger, constants, utils
│   ├── app.ts                    # Express app assembly (DI wiring)
│   └── server.ts                 # process entrypoint
├── tests/
│   ├── unit/
│   └── integration/
├── Dockerfile
├── docker-compose.override.yml   # service-local compose fragment (optional)
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

Dependency direction is strictly inward: `api` → `application` → `domain`. `infrastructure` implements `domain` interfaces and is wired in at `app.ts` via a small DI container (`tsyringe` or manual factory functions) — so the domain layer never imports Express, TypeORM, or amqplib directly.

## 10. Git Repository Structure

A monorepo is recommended for this project size (12 services, shared conventions, one team initially), using npm/pnpm workspaces so shared packages are versioned and consumed locally without publishing to a registry. Each service can still be built, tested, and deployed independently.

```
ora-platform/
├── apps/
│   ├── gateway/
│   ├── auth-service/
│   ├── user-service/
│   ├── researcher-service/
│   ├── repository-service/
│   ├── journal-service/
│   ├── ebook-service/
│   ├── library-service/
│   ├── wiki-service/
│   ├── notification-service/
│   ├── search-service/
│   └── monitoring-service/
├── packages/
│   ├── auth-client/          # shared JWT verification middleware/SDK
│   ├── event-bus/            # shared RabbitMQ publish/subscribe wrapper + event contracts
│   ├── logger/                # shared pino/winston config
│   ├── common-errors/         # shared HTTP error classes
│   └── eslint-config/ + tsconfig-base/
├── infra/
│   ├── docker-compose.yml            # full local stack
│   ├── docker-compose.prod.yml
│   ├── nginx/
│   ├── k8s/                          # manifests/helm charts for later
│   └── scripts/
├── docs/
│   ├── 01-architecture.md
│   ├── adr/                          # architecture decision records
│   └── openapi/                      # exported per-service specs
├── .github/workflows/                # CI: lint, test, build, image push per service (path-filtered)
├── package.json                       # workspaces root
└── README.md
```

Branching: trunk-based with short-lived feature branches (`feat/auth-refresh-token`), PR review required, CI must pass (lint, unit tests, Docker build) before merge to `main`. Each service tag is independent: `auth-service@1.2.0`, enabling independent release cadence.

## 11. Environment Strategy

| Environment | Purpose | Infra |
|---|---|---|
| `local` | Developer machine | Docker Compose, all services + Postgres + RabbitMQ + Redis + MinIO |
| `test` (CI) | Automated test runs | Docker Compose (ephemeral, torn down per run), seeded fixtures |
| `staging` | Pre-production integration | Kubernetes or Compose on a staging VM, mirrors prod topology at smaller scale |
| `production` | Live platform | Kubernetes (or managed container platform) on Ethio Telecom Cloud, managed PostgreSQL per service |

Configuration is 12-factor: every service reads config exclusively from environment variables, validated at boot (e.g. with `zod`/`envalid`) so a missing/invalid variable fails fast instead of misbehaving at runtime. Secrets (DB passwords, JWT signing keys, MinIO keys) are never committed; `.env.example` documents the shape, real values come from Docker secrets / Kubernetes secrets / a vault in staging and production.

## 12. Deployment Strategy

- **Local/dev:** `docker compose up`, one command brings up the full platform (gateway, all 12 services, Postgres instances, RabbitMQ, Redis, MinIO, Nginx).
- **CI/CD (GitHub Actions):** on PR — lint, typecheck, unit test, build Docker image (path-filtered so only changed services build). On merge to `main` — additionally push image to registry tagged with commit SHA and push to staging.
- **Staging → Production promotion:** a tagged release (`auth-service@1.2.0`) is what actually gets promoted to production, after staging smoke tests (health checks, key REST flows) pass — not an untagged `main` build.
- **Rollout:** rolling deployment per service (Kubernetes Deployment with readiness probes hitting `/health/ready`), so a bad deploy of one service never takes down the others; each service scales independently based on its own load.
- **Zero-downtime migrations:** migrations run as a pre-deploy job, expand/contract pattern for breaking schema changes (add nullable column → backfill → deploy code that uses it → later migration drops the old column).
- **Observability:** every service ships structured JSON logs to the central logging stack, exposes `/metrics` (Prometheus format) and `/health`/`/health/ready`, aggregated by `monitoring-service` and/or a Prometheus + Grafana stack sitting alongside it.

## 13. Cross-Cutting Service Contract (applies to every service in Phase 2+)

Every service, without exception, ships with: Clean Architecture layering as in §9; Repository Pattern (interface in `domain`, implementation in `infrastructure`); Service Layer Pattern for business logic; DTO validation on every inbound request; JWT verification middleware from the shared `auth-client` package (trusting `auth-service` as the token issuer); a multi-stage `Dockerfile`; a `docker-compose` entry; Swagger UI at `/api-docs` generated from JSDoc/TSdoc annotations or a `zod-to-openapi` schema; a `tests/unit` suite with Jest + ts-jest; structured request/error logging; and `GET /health` (liveness) plus `GET /health/ready` (readiness, checks DB + RabbitMQ connectivity).

## 14. Build Order

Authentication Service is built first (Phase 2) because every other service depends on it for token verification. Recommended order after that: User Management Service (auth needs it for role lookups) → API Gateway → Notification Service (needed by everything else for events) → Search Service → then the six content services (Journal, Ebook, Library, Wiki, Repository, Researcher Network) → Monitoring Service last (it observes everything else, so it's most useful once there's something to observe).

As of this pass, all six content services exist and are deployed, but only with their standalone RBAC slice (§2a) — role catalog and role assignment. Their actual business workflows (manuscript submission, book proofing, circulation, wiki editing, deposits, networking) are the next build increment, one module at a time, same as every other service in this document.
