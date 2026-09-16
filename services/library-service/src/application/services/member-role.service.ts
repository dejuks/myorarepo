import { IRoleRepository } from '@domain/repositories/role.repository.interface';
import { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';
import { NotFoundError, ValidationError } from '@common/errors/app-error';

/** This module's base role — auto-assigned alongside TOP_ROLE_NAME when the platform super-admin is bootstrapped, and cannot be revoked through the API. */
export const BASE_ROLE_NAME = 'MEMBER';

/** This module's top role — the only role allowed to create/delete custom roles and assign/revoke roles for other members. */
export const TOP_ROLE_NAME = 'LIBRARY_MANAGER';

/**
 * Manages per-member role assignment within the Library module.
 * `userId` is an opaque cross-service reference — this service holds no
 * profile data, unlike user-service's UserService which owns a User
 * entity. Same assign/revoke/lookup logic as the role-related methods on
 * user-service's UserService, minus the User entity.
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

    return this.listRolesForUser(userId);
  }

  async revokeRole(userId: string, roleName: string): Promise<string[]> {
    const role = await this.roleRepo.findByName(roleName);
    if (!role) throw new NotFoundError(`Role "${roleName}" does not exist`);

    if (role.name === BASE_ROLE_NAME) {
      throw new ValidationError(`The default "${BASE_ROLE_NAME}" role cannot be revoked`);
    }

    await this.userRoleRepo.revoke(userId, role.id);

    return this.listRolesForUser(userId);
  }
}
