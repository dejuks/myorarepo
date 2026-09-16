import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema for library_db, plus a seed of this module's role catalog.
 * Standalone RBAC for the Library Management module — no `users` table
 * here, `user_id` is an opaque cross-service reference (see docs/erd.md).
 */
export class InitLibraryServiceSchema1737000700000 implements MigrationInterface {
  name = 'InitLibraryServiceSchema1737000700000';

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
        ('LIBRARY_MANAGER',   'Oversees all library operations, staff, and policies for both digital and physical collections: sets circulation policies, supervises staff, approves acquisitions, generates usage reports.', true),
        ('DIGITAL_LIBRARIAN', 'Manages the digital resources within the library system: uploads and manages digital content, ensures metadata accuracy, organizes digital collections, monitors usage statistics.', true),
        ('LIBRARIAN',         'Manages day-to-day services for the physical library: manages lending and returning of items, handles holds and renewals, collects fines, assists patrons directly.', true),
        ('CATALOGER',         'Specialist who classifies and catalogs physical materials for easy retrieval: classifies items using DDC/LCC standards, assigns call numbers and barcodes, maintains catalog accuracy.', true),
        ('INVENTORY_MANAGER', 'Maintains the physical inventory and performs audits: conducts stocktaking and regular audits, manages item tagging (barcode/RFID), tracks inventory accuracy.', true),
        ('MEMBER',            'End-user of the library services: searches the catalog, borrows and returns items (physical and digital), places holds/reservations, views their own borrowing history.', true);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_role_assignments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles;`);
  }
}
