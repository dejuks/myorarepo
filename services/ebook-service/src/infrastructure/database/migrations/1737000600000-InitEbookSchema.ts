import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema for ebook_db, plus a seed of this module's system role
 * catalog. System roles (isSystem = true) map to the eBook Publishing
 * System's SRS-defined roles: BOOK_EDITOR (top role), DIGITAL_CONTENT_MANAGER,
 * FINANCE_OPERATIONS_OFFICER, AUTHOR_RESEARCHER (base role). See docs/erd.md
 * for the standalone-RBAC decision this schema implements.
 */
export class InitEbookSchema1737000600000 implements MigrationInterface {
  name = 'InitEbookSchema1737000600000';

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
        ('BOOK_EDITOR',                'Designated ORA staff member who oversees the entire book publishing workflow from submission to acceptance: performs initial manuscript screening, assigns peer reviewers, makes editorial decisions (accept/revise/reject), communicates with authors.', true),
        ('DIGITAL_CONTENT_MANAGER',    'Technical production role responsible for creating the final eBook product: validates file quality, converts manuscripts to PDF/EPUB, uploads final eBooks, assigns metadata (ISBN, DOI), sets access permissions.', true),
        ('FINANCE_OPERATIONS_OFFICER', 'Administrative role managing the financial aspects of book publication: manages Book Processing Charge payments, validates payments, issues invoices/receipts, approves/declines fee waiver requests.', true),
        ('AUTHOR_RESEARCHER',          'Individual submitting a manuscript for book publication: prepares and submits manuscripts with metadata, responds to peer-review feedback, approves the final proof.', true);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_role_assignments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles;`);
  }
}
