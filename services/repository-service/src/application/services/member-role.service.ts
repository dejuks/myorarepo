import { IRoleRepository } from '@domain/repositories/role.repository.interface';
import { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';
import { NotFoundError } from '@common/errors/app-error';

export interface MemberRoles {
  userId: string;
  roles: string[];
}

/**
 * Manages per-member role assignment within this module. `userId` is an
 * opaque cross-service reference here — this module has no User entity of
 * its own, exactly like auth-service's `userId` field has no FK to
 * user-service (see the platform's standalone-RBAC decision in
 * docs/erd.md).
 */
export class MemberRoleService {
  constructor(
    private readonly roleRepo: IRoleRepository,
    private readonly userRoleRepo: IUserRoleAssignmentRepository,
  ) {}

  async listRolesForUser(userId: string): Promise<MemberRoles> {
    const roles = await this.userRoleRepo.listRoleNamesForUser(userId);
    return { userId, roles };
  }

  async assignRole(userId: string, roleName: string, actorUserId: string): Promise<MemberRoles> {
    const role = await this.roleRepo.findByName(roleName);
    if (!role) throw new NotFoundError(`Role "${roleName}" does not exist`);

    await this.userRoleRepo.assign(userId, role.id, actorUserId);
    return this.listRolesForUser(userId);
  }

  async revokeRole(userId: string, roleName: string): Promise<MemberRoles> {
    const role = await this.roleRepo.findByName(roleName);
    if (!role) throw new NotFoundError(`Role "${roleName}" does not exist`);

    await this.userRoleRepo.revoke(userId, role.id);
    return this.listRolesForUser(userId);
  }
}
