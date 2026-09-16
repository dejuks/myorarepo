import { logger } from '@common/logger/logger';
import { computeBootstrapUserId } from '@common/utils/bootstrap-id.util';
import { BASE_ROLE_NAME, TOP_ROLE_NAME } from '@application/services/member-role.service';
import type { IRoleRepository } from '@domain/repositories/role.repository.interface';
import type { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';

export interface ModuleAdminBootstrapConfig {
  email?: string;
}

/**
 * Seeds the platform super-admin's role assignments in THIS module's
 * database on boot from SUPER_ADMIN_EMAIL — the library-module counterpart
 * to user-service's `super-admin.bootstrap.ts`. See that module's doc
 * comment for why every module seeds independently rather than calling
 * another service over HTTP (assigning roles here normally requires a
 * LIBRARY_MANAGER token — a chicken-and-egg problem for the very first
 * library admin).
 *
 * This service holds no profile data, so unlike user-service's bootstrap
 * there is no user row to create — only role assignments, keyed by the
 * same deterministic id (computeBootstrapUserId) every service derives
 * for the same email. Idempotent: safe to leave the env var set across
 * every restart.
 */
export async function bootstrapModuleAdmin(
  roleRepo: IRoleRepository,
  userRoleRepo: IUserRoleAssignmentRepository,
  config: ModuleAdminBootstrapConfig,
): Promise<void> {
  if (!config.email) {
    logger.debug('Module-admin bootstrap skipped: SUPER_ADMIN_EMAIL not set');
    return;
  }

  const email = config.email.trim().toLowerCase();
  const userId = computeBootstrapUserId(email);

  const rolesToAssign = [BASE_ROLE_NAME, TOP_ROLE_NAME];
  const assigned: string[] = [];

  for (const roleName of rolesToAssign) {
    const role = await roleRepo.findByName(roleName);
    if (!role) {
      logger.warn({ roleName }, 'Module-admin bootstrap: expected system role not found, skipping assignment — has the roles migration run?');
      continue;
    }

    const alreadyAssigned = await userRoleRepo.isAssigned(userId, role.id);
    if (alreadyAssigned) {
      logger.debug({ email, userId, roleName }, 'Module-admin bootstrap skipped: role assignment already exists');
      continue;
    }

    await userRoleRepo.assign(userId, role.id, null);
    assigned.push(roleName);
  }

  if (assigned.length > 0) {
    logger.info({ email, userId, roles: assigned }, 'Bootstrapped module admin role assignment(s)');
  }
}
