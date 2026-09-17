import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema for wiki_db, plus a seed of the wiki module's system role
 * catalog. This module owns its OWN roles/permissions — zero runtime
 * dependency on user-service or auth-service for authorization (see
 * docs/erd.md for the standalone-RBAC rationale). Roles are condensed
 * from the platform SRS's "Oromo Wikipedia Platform" section:
 *   - REGISTERED_EDITOR (base role) — creates/edits articles, uploads media
 *   - ADMINISTRATOR ("Sysop") — content/user moderation
 *   - BUREAUCRAT (top role) — role management and platform governance
 *   - OVERSIGHTER ("CheckUser") — privacy-sensitive abuse control
 *
 * `description` is VARCHAR(500), not the platform's usual 255: two of the
 * seeded system-role descriptions below (ADMINISTRATOR, OVERSIGHTER) run
 * past 255 characters, which made this migration fail outright (whole
 * transaction rolled back, so `roles` was never created) the first time it
 * ever ran anywhere. Since it had never successfully applied — nothing in
 * production ever depended on the narrower column — this file was edited
 * in place rather than patched with a follow-up migration, which is the
 * one situation where that's safe (see repo convention: migrations are
 * otherwise always new files, never edited, once real data exists).
 */
export class InitWikiSchema1737000800000 implements MigrationInterface {
  name = 'InitWikiSchema1737000800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE roles (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(50) NOT NULL UNIQUE,
        description   VARCHAR(500),
        is_system     BOOLEAN NOT NULL DEFAULT false,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE user_role_assignments (
        user_id       UUID NOT NULL,
        role_id       UUID NOT NULL,
        assigned_by   UUID,
        assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, role_id),
        CONSTRAINT fk_ura_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_ura_user_id ON user_role_assignments(user_id);
    `);

    await queryRunner.query(`
      INSERT INTO roles (name, description, is_system) VALUES
        ('REGISTERED_EDITOR', 'Community member who actively creates and edits articles in Afaan Oromo: creates new articles, edits existing content, uploads free-license images/media, participates in policy discussions.', true),
        ('ADMINISTRATOR',     'Trusted user with elevated rights to manage content and user behavior to maintain the wiki''s integrity: deletes/restores pages, blocks vandals and disruptive IPs, protects sensitive pages from edits, closes deletion discussions. Referred to as "Sysop" in the SRS.', true),
        ('BUREAUCRAT',        'Senior user responsible for managing user roles and global platform actions: promotes or demotes local administrators, renames user accounts globally, oversees governance policies.', true),
        ('OVERSIGHTER',       'Highly trusted user with access to sensitive information for abuse control, bound by strict privacy guidelines: suppresses revisions containing private data (e.g. GDPR compliance), views user IP addresses only in serious cases of abuse. Also referred to as "CheckUser" in the SRS.', true);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_role_assignments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles;`);
  }
}
