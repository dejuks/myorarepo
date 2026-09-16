# ORA Platform — Researcher Service

Owns roles and role assignments for the Researchers' Network Platform — standalone RBAC for professional networking, groups, and community content (profile/networking/group workflows live in a future pass; this slice is authorization only).

## How it works

This is a standalone RBAC slice, not the full Researchers' Network module. It owns its own role catalog (`roles`) and its own user-to-role assignments (`user_role_assignments`) in `researcher_db`, with **zero runtime dependency** on `user-service` or `auth-service` for authorization: it only trusts the JWT (verified locally, same shared `JWT_ACCESS_SECRET` contract every service already uses) for the caller's *identity* (`userId`, `email`). It never calls another service over HTTP to check what role someone has — that lookup is 100% local to this service's own database. There is no separate granular Permission entity — "permission" is expressed entirely as `requireRoles(...)` guards on routes. See `docs/erd.md` for the schema and the standalone-RBAC design note.

## Role catalog

| Role | Description |
| --- | --- |
| `RESEARCHER_MEMBER` (base role) | Academic who uses the platform to connect, collaborate, and share work: creates and maintains a detailed professional profile, searches for and connects with peers, participates in messaging, forums, and groups. |
| `GROUP_MODERATOR` | Researcher who oversees a specific research group: approves and manages group memberships, moderates group discussions, ensures adherence to community guidelines. |
| `EVENT_CONTENT_MANAGER` | Curation role focused on keeping the community engaged and informed: publishes announcements for journal calls, conferences, and events; keeps platform content up-to-date; sends notifications to users. |
| `PLATFORM_ADMINISTRATOR` (top role) | Manages the settings, user accounts, and policies of the networking platform: manages user registrations and roles, oversees security and privacy settings, handles system maintenance and updates. Only role allowed to create/delete custom roles and assign/revoke roles for other members. |

All four are seeded as `is_system = true` by the initial migration and cannot be deleted through the API.

## Quick start

```bash
cp .env.example .env
npm install
npm run typeorm -- migration:run   # seeds the 4 system roles
npm run dev                         # http://localhost:4003, docs at /api-docs
```

Or with Docker: `docker compose up --build`

## Testing

```bash
npm test         # unit tests (RoleService/MemberRoleService/bootstrap via in-memory repository fakes)
npm run test:cov
```

## Module-admin bootstrap

If `SUPER_ADMIN_EMAIL` is set, the userId derived from that email (the same deterministic UUID v5 every service in the platform derives for the same email) is assigned both `RESEARCHER_MEMBER` and `PLATFORM_ADMINISTRATOR` once at startup — idempotent, safe to leave set across restarts. This solves the same chicken-and-egg problem the platform-wide super-admin bootstrap solves: the first person able to assign roles in this module needs a role already assigned by *someone*.

## REST surface

Mounted at `/api/v1` inside the service; the gateway forwards the full `/api/v1/researchers/...` path unchanged.

- `GET  /roles` — list this module's role catalog. Authenticated.
- `POST /roles` — create a custom (non-system) role. `PLATFORM_ADMINISTRATOR` only.
- `DELETE /roles/:id` — delete a custom role (system roles protected). `PLATFORM_ADMINISTRATOR` only.
- `GET  /members/:userId/roles` — list a member's roles in this module. Self or `PLATFORM_ADMINISTRATOR`.
- `POST /members/:userId/roles` — assign a role to a member (body: `{ roleName }`). `PLATFORM_ADMINISTRATOR` only.
- `DELETE /members/:userId/roles/:roleName` — revoke a role from a member. `PLATFORM_ADMINISTRATOR` only.
