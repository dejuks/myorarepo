import { IRoleRepository } from '@domain/repositories/role.repository.interface';
import { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';
import { NotFoundError } from '@common/errors/app-error';

/**
 * Manages per-member role ASSIGNMENT within the wiki module (who holds
 * which role). The role catalog itself is RoleService's job. There is no
 * User entity here — `userId` is an opaque cross-service reference,
 * exactly like auth-service's `userId` field has no FK to user-service.
 *
 * Every method returns the member's role NAMES as a bare string[] — this
 * matches every other module service (journal/ebook/repository/researcher)
 * and, critically, the frontend's single generic `moduleApi.ts` client,
 * which is shared across all six modules and always expects a bare array.
 * This service previously wrapped it as `{ userId, roles }` instead, which
 * silently broke `useMyManagedModules()`'s self-check (`data?.includes(topRole)`
 * evaluated against an object, not the roles list) — a wiki-module manager
 * (e.g. someone holding BUREAUCRAT, but not platform-wide ADMIN) would
 * never see the "Wiki — Roles" sidebar link, even though their role
 * assignment in wiki_db was correct all along.
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
