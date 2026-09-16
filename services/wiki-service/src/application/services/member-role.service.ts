import { IRoleRepository } from '@domain/repositories/role.repository.interface';
import { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';
import { NotFoundError } from '@common/errors/app-error';

export interface MemberRoles {
  userId: string;
  roles: string[];
}

/**
 * Manages per-member role ASSIGNMENT within the wiki module (who holds
 * which role). The role catalog itself is RoleService's job. There is no
 * User entity here — `userId` is an opaque cross-service reference,
 * exactly like auth-service's `userId` field has no FK to user-service.
 */
export class MemberRoleService {
  constructor(
    private readonly roleRepo: IRoleRepository,
    private readonly userRoleRepo: IUserRoleAssignmentRepository,
  ) {}

  async listRolesForUser(userId: string): Promise<string[]> {
    return this.userRoleRepo.listRoleNamesForUser(userId);
  }

  async assignRole(userId: string, roleName: string, actorUserId: string): Promise<MemberRoles> {
    const role = await this.roleRepo.findByName(roleName);
    if (!role) throw new NotFoundError(`Role "${roleName}" does not exist`);

    await this.userRoleRepo.assign(userId, role.id, actorUserId);

    return { userId, roles: await this.userRoleRepo.listRoleNamesForUser(userId) };
  }

  async revokeRole(userId: string, roleName: string): Promise<MemberRoles> {
    const role = await this.roleRepo.findByName(roleName);
    if (!role) throw new NotFoundError(`Role "${roleName}" does not exist`);

    await this.userRoleRepo.revoke(userId, role.id);

    return { userId, roles: await this.userRoleRepo.listRoleNamesForUser(userId) };
  }
}
