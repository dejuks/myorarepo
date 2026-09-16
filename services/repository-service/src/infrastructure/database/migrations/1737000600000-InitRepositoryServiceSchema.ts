import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema for repository_db: this module's standalone role catalog
 * (`roles`) and per-member role assignment (`user_role_assignments`),
 * seeded with the ORA Repository Management System's role catalog. See
 * docs/erd.md for the standalone-RBAC design note.
 */
export class InitRepositoryServiceSchema1737000600000 implements MigrationInterface {
  name = 'InitRepositoryServiceSchema1737000600000';

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
        ('RESEARCHER_AUTHOR', 'Individual depositing their scholarly work into the repository: uploads documents and datasets, provides complete and accurate bibliographic metadata (Dublin Core), specifies the access level (Open/Restricted).', true),
        ('REPOSITORY_CURATOR', 'Trusted staff member who manages deposits, metadata, and access policies: validates metadata quality, enriches records with controlled vocabularies, verifies copyright policies, applies access controls.', true),
        ('CONTENT_REVIEWER', 'Subject-matter expert who verifies the academic integrity of submissions: assesses academic quality and relevance, checks for plagiarism, recommends approval or revision.', true),
        ('REPOSITORY_ADMINISTRATOR', 'Oversees the overall operations and policies of the repository: makes the final approval on all submissions, manages access control policies, generates analytics reports including bibliographic usage statistics, manages user accounts and permissions.', true),
        ('SYSTEM_ADMINISTRATOR', 'Manages technical infrastructure and data security for the repository: maintains system installation, backups, and security, performs updates and performance monitoring, provides technical support.', true);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_role_assignments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles;`);
  }
}
