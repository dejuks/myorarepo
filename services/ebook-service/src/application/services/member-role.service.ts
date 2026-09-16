import { IRoleRepository } from '@domain/repositories/role.repository.interface';
import { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';
import { NotFoundError } from '@common/errors/app-error';

/**
 * Manages role ASSIGNMENT for members of this module. The role catalog
 * itself lives in RoleService; this is who currently holds which role.
 * `userId` is an opaque cross-service reference — this service holds no
 * user profile data, so there is no existence check on the member, only on
 * the role being assigned/revoked (mirrors auth-service's userId field,
 * which has no FK to user-service).
 */
export class MemberRoleService {
  constructor(
    private readonly roleRepo: IRoleRepository,
    private readonly userRoleRepo: IUserRoleAssignmentRepository,
  ) {}

  async listRolesForUser(userId: string): Promise<string[]> {
    return this.userRoleRepo.listRoleNamesForUser(userId);
  }

  async assignRole(userId: string, roleName: string, actorUserId: string): Promise<string[]> {
    const role = await this.roleRepo.findByName(roleName);
    if (!role) throw new NotFoundError(`Role "${roleName}" does not exist`);

    await this.userRoleRepo.assign(userId, role.id, actorUserId);
    return this.userRoleRepo.listRoleNamesForUser(userId);
  }

  async revokeRole(userId: string, roleName: string): Promise<string[]> {
    const role = await this.roleRepo.findByName(roleName);
    if (!role) throw new NotFoundError(`Role "${roleName}" does not exist`);

    await this.userRoleRepo.revoke(userId, role.id);
    return this.userRoleRepo.listRoleNamesForUser(userId);
  }
}
