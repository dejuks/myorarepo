import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema for journal_db, plus a seed of the journal module's role
 * catalog. This module owns its OWN roles/permissions catalog and its own
 * user-to-role assignments, fully standalone — zero runtime dependency on
 * user-service or auth-service for authorization (see docs/erd.md for the
 * full design rationale).
 */
export class InitJournalSchema1737000500000 implements MigrationInterface {
  name = 'InitJournalSchema1737000500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE roles (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(50) NOT NULL UNIQUE,
        description   VARCHAR(255),
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
        ('JOURNAL_MANAGER',  'Configures journal settings, sections, and submission policies; maintains the peer-review workflow; oversees technical performance of the journal.', true),
        ('EDITOR_IN_CHIEF',  'Senior academic leader with ultimate authority over a journal''s content and quality; makes the final accept/reject decision on manuscripts, assigns Associate Editors, ensures academic and ethical compliance.', true),
        ('ASSOCIATE_EDITOR', 'Subject-matter expert who manages peer review for assigned manuscripts: conducts initial screening, selects and invites reviewers, evaluates feedback, recommends a decision to the EIC.', true),
        ('REVIEWER',         'External subject-matter expert who reviews manuscript content for methodology, ethics, and quality; provides structured, confidential feedback; adheres to blinded review policies.', true),
        ('AUTHOR',           'Researcher submitting work for publication: submits manuscripts with required metadata, responds to reviewer comments with revisions, ensures originality and ethical compliance.', true);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_role_assignments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles;`);
  }
}
