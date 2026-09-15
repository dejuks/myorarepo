import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema for user_db, plus a seed of the platform's system roles.
 * System roles (isSystem = true) map to the "Users / Clients" swimlane in
 * the platform architecture diagram: Public Users, Researchers/Authors,
 * Editors/Reviewers, Librarians, Administrators.
 */
export class InitUserSchema1737000100000 implements MigrationInterface {
  name = 'InitUserSchema1737000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "citext";`);

    await queryRunner.query(`
      CREATE TYPE user_status_enum AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id                UUID PRIMARY KEY,
        email             CITEXT NOT NULL UNIQUE,
        first_name        VARCHAR(100) NOT NULL,
        last_name         VARCHAR(100) NOT NULL,
        display_name      VARCHAR(150),
        avatar_url        VARCHAR,
        bio               TEXT,
        phone             VARCHAR(30),
        locale            VARCHAR(10) NOT NULL DEFAULT 'en',
        status            user_status_enum NOT NULL DEFAULT 'PENDING',
        deactivated_at    TIMESTAMPTZ,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_users_status ON users(status);
    `);

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
        ('USER',         'Default role for every registered account',                 true),
        ('RESEARCHER',   'Researcher / author — can submit to journals and deposit to the repository', true),
        ('EDITOR',       'Journal editor — manages editorial workflow',                true),
        ('REVIEWER',     'Peer reviewer',                                              true),
        ('LIBRARIAN',    'Manages library catalog and circulation',                    true),
        ('ADMIN',        'Platform administrator',                                     true);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_role_assignments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users;`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_status_enum;`);
  }
}
