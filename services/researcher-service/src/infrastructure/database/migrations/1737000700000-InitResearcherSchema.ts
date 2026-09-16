import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema for researcher_db, plus a seed of this module's role
 * catalog. This module owns its RBAC entirely standalone — no `users`
 * table, no foreign key to any other service's database. `userId` in
 * `user_role_assignments` is an opaque cross-service reference.
 */
export class InitResearcherSchema1737000700000 implements MigrationInterface {
  name = 'InitResearcherSchema1737000700000';

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
        ('RESEARCHER_MEMBER',      'Academic who uses the platform to connect, collaborate, and share work: creates and maintains a detailed professional profile, searches for and connects with peers, participates in messaging, forums, and groups.', true),
        ('GROUP_MODERATOR',        'Researcher who oversees a specific research group: approves and manages group memberships, moderates group discussions, ensures adherence to community guidelines.', true),
        ('EVENT_CONTENT_MANAGER',  'Curation role focused on keeping the community engaged and informed: publishes announcements for journal calls, conferences, and events; keeps platform content up-to-date; sends notifications to users.', true),
        ('PLATFORM_ADMINISTRATOR', 'Manages the settings, user accounts, and policies of the networking platform: manages user registrations and roles, oversees security and privacy settings, handles system maintenance and updates.', true);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_role_assignments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles;`);
  }
}
