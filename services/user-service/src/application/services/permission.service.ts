import { IPermissionRepository } from '@domain/repositories/permission.repository.interface';
import { IRolePermissionRepository } from '@domain/repositories/role-permission.repository.interface';
import { IRoleRepository } from '@domain/repositories/role.repository.interface';
import { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';
import { Permission } from '@domain/entities/permission.entity';
import { Role } from '@domain/entities/role.entity';
import { NotFoundError, ValidationError } from '@common/errors/app-error';

export interface RolePermissionsResult {
  role: Role;
  permissionKeys: string[];
}

/**
 * Platform-wide role→permission catalog and the live enforcement check
 * behind requirePermission()/requireSelfOrPermission(). The permission
 * catalog itself (Permission rows) is fixed and seeded by migration —
 * only which permissions a ROLE grants is editable, from that role's own
 * edit view in Admin → Roles (see AdminRolesPage.tsx / RolePermissionsDialog).
 */
export class PermissionService {
  constructor(
    private readonly permissionRepo: IPermissionRepository,
    private readonly rolePermissionRepo: IRolePermissionRepository,
    private readonly roleRepo: IRoleRepository,
    private readonly userRoleRepo: IUserRoleAssignmentRepository,
  ) {}

  async listPermissions(): Promise<Permission[]> {
    return this.permissionRepo.listAll();
  }

  async getRolePermissions(roleId: string): Promise<RolePermissionsResult> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) throw new NotFoundError('Role not found');

    const permissionKeys = await this.rolePermissionRepo.listPermissionKeysForRole(roleId);
    return { role, permissionKeys };
  }

  /** Replaces a role's full permission set. Rejects unknown keys instead of silently dropping them. */
  async setRolePermissions(roleId: string, keys: string[]): Promise<RolePermissionsResult> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) throw new NotFoundError('Role not found');

    const uniqueKeys = [...new Set(keys)];
    const permissions = await this.permissionRepo.findByKeys(uniqueKeys);
    if (permissions.length !== uniqueKeys.length) {
      const found = new Set(permissions.map((p) => p.key));
      const unknown = uniqueKeys.filter((k) => !found.has(k));
      throw new ValidationError(`Unknown permission key(s): ${unknown.join(', ')}`);
    }

    await this.rolePermissionRepo.setForRole(
      roleId,
      permissions.map((p) => p.id),
    );

    return { role, permissionKeys: permissions.map((p) => p.key) };
  }

  /**
   * Real, live enforcement check for one user against one permission key.
   * Both the user's current role assignments AND those roles' current
   * permissions are read fresh from the database on every call — nothing
   * here is sourced from the caller's JWT. That is what lets an admin
   * change a role's permissions, or promote/demote a user, and have it
   * apply on the user's very next request, with no re-login required.
   */
  async userHasPermission(userId: string, permissionKey: string): Promise<boolean> {
    const roleNames = await this.userRoleRepo.listRoleNamesForUser(userId);
    if (roleNames.length === 0) return false;

    const grantedKeys = await this.rolePermissionRepo.listPermissionKeysForRoleNames(roleNames);
    return grantedKeys.includes(permissionKey);
  }
}
