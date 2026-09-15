# ORA Platform — Notification Service

Dispatches email/SMS/push/in-app notifications, driven primarily by domain events from every other service, and serves each user their in-app notification feed. See `docs/01-architecture.md` (platform monorepo root) §6 for the event catalog and `docs/erd.md` (this folder) for the `notification_db` schema.

## How it works

This service is primarily a RabbitMQ **consumer**: `src/infrastructure/messaging/event-consumer.ts` subscribes to `ora.auth.events` and `ora.user.events` (topic exchanges, wildcard-bound), and `NotificationDispatchService` maps each inbound event type to one or more notification templates via `src/application/services/event-template-map.ts` — add a new event by adding one line there plus matching template rows. Rendered notifications are persisted as a delivery-log row (`notifications` table) and, for `EMAIL`, sent through a swappable `IEmailProvider` (a zero-dependency console/log stub ships by default — see `.env.example`'s `EMAIL_PROVIDER` note and `infrastructure/providers/smtp-email.provider.ts` for where a real SMTP integration plugs in). `IN_APP` notifications are simply persisted and read back via `GET /notifications`.

A small local `user_contact_cache` table (populated from event payloads as they arrive) lets this service resolve a `userId` to an email without a synchronous call back to `user-service` — the same "derived read-model" pattern `search-service` will use, documented in `docs/01-architecture.md` §3.

## Quick start

```bash
cp .env.example .env
npm install
npm run typeorm -- migration:run   # seeds the notification templates
npm run dev                         # http://localhost:4009, docs at /api-docs
```

With Docker: `docker compose up --build`

## Testing

```bash
npm test
```

Covers `NotificationDispatchService` (multi-channel dispatch, contact-cache fallback, failure handling, unmapped/incomplete events), `NotificationQueryService` (ownership checks on mark-as-read, pagination, unread filtering), and the template-rendering utility.

## REST surface

`GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `POST /notifications/read-all` (all authenticated, scoped to the caller); `GET/POST/PATCH /notification-templates` (admin only, for managing the template catalog without a deploy).
