import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema for library_db, plus a seed of this module's role catalog.
 * Standalone RBAC for the Library Management module — no `users` table
 * here, `user_id` is an opaque cross-service reference (see docs/erd.md).
 * Covers both the Digital and Physical Library Management sub-systems from
 * the SRS, seeded together in one catalog (one `library-service`, one
 * `library_db`) rather than as two separate services.
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
        ('LIBRARY_MANAGER',     'Oversees all library operations, staff, and policies for both digital and physical collections: sets circulation policies, supervises staff and volunteers, approves acquisitions and budgets, generates usage/inventory reports, coordinates with Acquisition Officer and Cataloger.', true),
        ('ADMIN',               'Digital-library system configuration and access-control role: creates/manages users, assigns roles/permissions, configures system settings, manages backups/security, monitors system logs, approves content uploads.', true),
        ('SYSTEM_ADMINISTRATOR','Maintains the library management software and backend systems: manages user accounts and permissions, maintains software/hardware, performs backups and security, configures system settings, troubleshoots technical issues.', true),
        ('DIGITAL_LIBRARIAN',   'Manages the digital resources within the library system: uploads and manages digital content, ensures metadata accuracy, organizes digital collections, monitors usage statistics.', true),
        ('LIBRARIAN',           'Manages day-to-day services for the physical library: manages lending and returning of items, handles holds and renewals, collects fines, assists patrons directly, supports inventory accuracy.', true),
        ('ACQUISITION_OFFICER', 'Handles procurement and processing of physical books and materials: identifies and orders books/materials, manages vendor relations, receives and inspects deliveries, coordinates with cataloging and inventory teams.', true),
        ('CATALOGER',           'Specialist who classifies and catalogs physical materials for easy retrieval: classifies items using DDC/LCC standards, assigns call numbers and barcodes/RFID tags, maintains catalog accuracy.', true),
        ('INVENTORY_MANAGER',   'Maintains the physical inventory and performs audits: conducts shelf reading and stocktaking, tracks missing/damaged items, manages tagging (barcode/RFID), coordinates periodic audits.', true),
        ('CONTENT_UPLOADER',    'Optional role (e.g. teachers/assistants) submitting digital content: uploads ebooks/journals/papers, enters metadata, submits for approval, maintains accuracy.', true),
        ('EXTERNAL_PUBLISHER',  'Optional role for external providers supplying licensed or subscribed content: provides/uploads content packages, maintains metadata quality, ensures DRM/licensing compliance, updates editions/issues.', true),
        ('MEMBER',              'End-user of the library services (digital and physical): searches the catalog/OPAC, borrows and returns items, places holds/reservations and renewals, views their own borrowing history, pays fines.', true);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_role_assignments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles;`);
  }
}
