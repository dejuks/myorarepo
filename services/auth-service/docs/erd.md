# auth_db — Entity Relationship Diagram

`auth_db` is owned exclusively by `auth-service`. `user_id` is the platform-wide identifier shared with `user-service`'s `user_db` — there is no foreign key across databases, only an application-level UUID reference reconciled through domain events.

```mermaid
erDiagram
    USER_CREDENTIALS ||--o{ REFRESH_TOKENS : "has many"
    USER_CREDENTIALS ||--o{ PASSWORD_RESET_TOKENS : "has many"
    USER_CREDENTIALS ||--o{ AUTH_AUDIT_LOGS : "generates"

    USER_CREDENTIALS {
        uuid id PK
        uuid user_id UK "FK (logical) -> user_service.users.id"
        citext email UK
        varchar password_hash
        varchar_array roles
        enum account_status
        boolean mfa_enabled
        varchar mfa_secret
        int failed_login_attempts
        timestamptz locked_until
        timestamptz last_login_at
        timestamptz email_verified_at
        timestamptz created_at
        timestamptz updated_at
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        varchar user_agent
        varchar ip_address
        timestamptz expires_at
        timestamptz revoked_at
        uuid replaced_by_token_id
        timestamptz created_at
    }

    PASSWORD_RESET_TOKENS {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        timestamptz expires_at
        timestamptz used_at
        timestamptz created_at
    }

    AUTH_AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        enum event_type
        varchar ip_address
        varchar user_agent
        jsonb metadata
        timestamptz created_at
    }
```

Design notes: `password_hash` and `mfa_secret` never leave this database and are never included in any event payload. `token_hash` columns store SHA-256 hashes only — raw JWTs are never persisted, so a database leak does not by itself yield usable tokens. `roles` is a denormalized array maintained by `user-service` events (`UserRoleChanged`) so `auth-service` can embed roles directly into access tokens without a synchronous call on every login.
