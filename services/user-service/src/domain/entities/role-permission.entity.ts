import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * Many-to-many join between roles and permissions — this table IS the
 * "role's edit view" checkbox state from the admin UI. A row here means
 * "this role grants this permission." Deleting a role or permission
 * cascades (see migration FKs).
 */
@Entity({ name: 'role_permissions' })
export class RolePermission {
  @PrimaryColumn('uuid', { name: 'role_id' })
  roleId!: string;

  @PrimaryColumn('uuid', { name: 'permission_id' })
  permissionId!: string;

  @CreateDateColumn({ name: 'granted_at', type: 'timestamptz' })
  grantedAt!: Date;
}
