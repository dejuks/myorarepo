import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema for auth_db. Run with: npm run typeorm -- migration:run
 * (or via node-pg-migrate if the team prefers SQL-first migrations —
 * see infrastructure/database/migrations/sql/001_init_auth_schema.sql
 * for the equivalent raw SQL, kept in sync for documentation/ERD purposes).
 */
export class InitAuthSchema1737000000000 implements MigrationInterface {
  name = 'InitAuthSchema1737000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "citext";`);

    await queryRunner.query(`
      CREATE TYPE account_status_enum AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'LOCKED', 'DISABLED');
    `);

    await queryRunner.query(`
      CREATE TYPE auth_audit_event_type_enum AS ENUM (
        'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'TOKEN_REFRESH',
        'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED',
        'ACCOUNT_LOCKED', 'MFA_ENABLED', 'MFA_DISABLED',
        'EMAIL_VERIFICATION_REQUESTED', 'EMAIL_VERIFICATION_COMPLETED',
        'PLATFORM_SETTINGS_UPDATED'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE user_credentials (
        id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                UUID NOT NULL UNIQUE,
        email                  CITEXT NOT NULL UNIQUE,
        password_hash          VARCHAR NOT NULL,
        roles                  VARCHAR[] NOT NULL DEFAULT '{}',
        account_status         account_status_enum NOT NULL DEFAULT 'PENDING_VERIFICATION',
        mfa_enabled            BOOLEAN NOT NULL DEFAULT false,
        mfa_secret             VARCHAR,
        failed_login_attempts  INTEGER NOT NULL DEFAULT 0,
        locked_until           TIMESTAMPTZ,
        last_login_at          TIMESTAMPTZ,
        email_verified_at      TIMESTAMPTZ,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                UUID NOT NULL,
        token_hash             VARCHAR NOT NULL UNIQUE,
        user_agent             VARCHAR,
        ip_address             VARCHAR,
        expires_at             TIMESTAMPTZ NOT NULL,
        revoked_at             TIMESTAMPTZ,
        replaced_by_token_id   UUID,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    `);

    await queryRunner.query(`
      CREATE TABLE password_reset_tokens (
        id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                UUID NOT NULL,
        token_hash             VARCHAR NOT NULL UNIQUE,
        expires_at             TIMESTAMPTZ NOT NULL,
        used_at                TIMESTAMPTZ,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
    `);

    await queryRunner.query(`
      CREATE TABLE email_verification_tokens (
        id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                UUID NOT NULL,
        token_hash             VARCHAR NOT NULL UNIQUE,
        expires_at             TIMESTAMPTZ NOT NULL,
        used_at                TIMESTAMPTZ,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
    `);

    await queryRunner.query(`
      CREATE TABLE auth_audit_logs (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id        UUID,
        event_type     auth_audit_event_type_enum NOT NULL,
        ip_address     VARCHAR,
        user_agent     VARCHAR,
        metadata       JSONB,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_auth_audit_logs_user_id ON auth_audit_logs(user_id);
      CREATE INDEX idx_auth_audit_logs_created_at ON auth_audit_logs(created_at);
    `);

    // Single-row runtime settings table — see domain/entities/platform-setting.entity.ts.
    // The row itself is seeded by bootstrapPlatformSettings() at service boot, not here,
    // since its initial value comes from the REQUIRE_EMAIL_VERIFICATION env var.
    await queryRunner.query(`
      CREATE TABLE platform_settings (
        id                            SMALLINT PRIMARY KEY DEFAULT 1,
        require_email_verification    BOOLEAN NOT NULL DEFAULT true,
        updated_by                    UUID,
        updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT platform_settings_singleton CHECK (id = 1)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS platform_settings;`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth_audit_logs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS email_verification_tokens;`);
    await queryRunner.query(`DROP TABLE IF EXISTS password_reset_tokens;`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_credentials;`);
    await queryRunner.query(`DROP TYPE IF EXISTS auth_audit_event_type_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS account_status_enum;`);
  }
}
