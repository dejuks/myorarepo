# ORA Platform — Search Service

Cross-domain search indexing and querying over every content service (journals, ebooks, the digital library, the institutional repository, Oromo Wikipedia, and researcher profiles). See `docs/01-architecture.md` (platform monorepo root) §2/§3 for its place in the platform and `docs/erd.md` (this folder) for the `search_db` schema.

## How it works

This service is a **derived store, not a source of truth** (`docs/01-architecture.md` §3, "Search is a derived store"). It never originates data and exposes no write/ingest REST endpoint — the only way a document enters or leaves the index is through `src/infrastructure/messaging/event-consumer.ts`, which subscribes (wildcard `#` binding, one durable queue + DLQ per exchange, exactly like `notification-service`) to every content service's topic exchange: `ora.journal.events`, `ora.ebook.events`, `ora.library.events`, `ora.repository.events`, `ora.wiki.events`, `ora.researcher.events`.

None of those six content services exist yet in this monorepo. That's fine — `channel.assertExchange`/`assertQueue`/`bindQueue` are idempotent and don't require the producer to be running, so this service binds to all six exchanges from day one, the same way `notification-service` already binds to `ora.auth.events`/`ora.user.events`. Indexing starts working automatically, with zero code changes here, the moment each content service is built and publishes its first `*.published` event.

Each inbound event's routing key and payload are mapped to an index-or-delete action by one small, pure, well-tested function: `src/application/services/event-mapper.ts`'s `mapEventToSearchAction`. A routing key ending in `.deleted` (or a payload carrying `deleted`/`isDeleted: true`) removes the document; everything else upserts it, keyed on `(entityType, entityId)`. Because producer payload shapes don't exist yet and will evolve, the mapper never throws — anything it doesn't recognize (wrong exchange, non-object payload, missing `id`, missing `title` on a non-delete event) becomes an `{ kind: 'ignore' }` result that the consumer logs and acks, rather than crashing or dead-lettering forever on a shape it doesn't understand yet.

Full-text search itself is plain PostgreSQL (`tsvector` + a `GIN` index), not a separate search engine — see `docs/erd.md` for the generated-column design. This keeps the platform's infrastructure footprint the same (no OpenSearch/Elasticsearch cluster to run) while still satisfying "Postgres full-text or OpenSearch" from the architecture doc.

## Quick start

```bash
cp .env.example .env
npm install
npm run typeorm -- migration:run
npm run dev                         # http://localhost:4010, docs at /api-docs
```

With Docker: `docker compose up --build`

Because this is a derived store with nothing publishing to it yet, `GET /search` will correctly return an empty paginated result (`{ success: true, data: [], meta: { total: 0, ... } }`) until journal-service/ebook-service/etc. are built — that's expected, not a bug.

## Testing

```bash
npm test
```

Covers `SearchIndexService` (upsert creates vs. updates by the `(entityType, entityId)` natural key, delete-by-entity), `SearchQueryService` (pagination math, filtering by `entityType`/`sourceService`, empty-query and no-match behavior, 404 on an unknown id), and `mapEventToSearchAction` (published/updated/deleted routing keys, the `deleted` payload flag, unrecognized exchanges, and several malformed-payload shapes that must not throw).

## REST surface

`GET /search?q=&type=&source=&page=&limit=` — public, no auth required (this is a public-facing search feature; see `services/gateway/src/config/service-registry.ts`'s `requiresAuth: false` for this route). `q` is matched via `plainto_tsquery` against `title` (weighted higher) and `description`; `type` filters by `entityType` (e.g. `journal_article`); `source` filters by `sourceService` (e.g. `journal-service`); `limit` is capped at 50. `GET /search/:id` fetches one indexed document by its `search_documents` id, 404 if missing. `GET /health`, `GET /health/ready`. There is intentionally no POST/PUT/DELETE route on this service — indexing only happens via consumed events (see "How it works" above).
