import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the platform-wide role-based permission system: a fixed, seeded
 * `permissions` catalog and a `role_permissions` join table that records
 * which permissions each role (from the existing `roles` table) grants.
 *
 * This is a NEW migration file rather than an in-place edit of
 * InitUserSchema — unlike earlier features in this project, `roles` and
 * `user_role_assignments` already hold real data in deployed environments
 * by the time this was written, so editing the original migration would
 * silently no-op there (TypeORM already recorded InitUserSchema as run)
 * and require another manual psql fix. A fresh migration name always runs.
 *
 * ADMIN is granted every permission that exists at migration time, so the
 * bootstrapped super-admin has full access immediately. Permissions added
 * to the catalog by a *later* migration are NOT retroactively granted to
 * any role — an admin grants them explicitly from that role's edit view.
 */
export class AddPermissions1758000200000 implements MigrationInterface {
  name = 'AddPermissions1758000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE permissions (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key           VARCHAR(100) NOT NULL UNIQUE,
        category      VARCHAR(100) NOT NULL,
        label         VARCHAR(150) NOT NULL,
        description   VARCHAR(255),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE role_permissions (
        role_id       UUID NOT NULL,
        permission_id UUID NOT NULL,
        granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (role_id, permission_id),
        CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_rp_permission_id ON role_permissions(permission_id);
    `);

    await queryRunner.query(`
      INSERT INTO permissions (key, category, label, description) VALUES
        ('users.view',           'User Management', 'View users',          'View user profiles and account details'),
        ('users.manage',         'User Management', 'Manage users',        'Edit profiles, and suspend, deactivate, or reactivate accounts on behalf of a user'),
        ('roles.view_catalog',   'Role Management', 'View roles',          'View the platform role catalog'),
        ('roles.manage_catalog', 'Role Management', 'Manage roles',        'Create and delete custom roles, and edit which permissions each role grants'),
        ('roles.assign',         'Role Management', 'Assign roles',        'Assign or revoke a role on a user account');
    `);

    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'ADMIN';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS role_permissions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS permissions;`);
  }
}
