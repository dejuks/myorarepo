import { logger } from '@common/logger/logger';
import { computeBootstrapUserId } from '@common/utils/bootstrap-id.util';
import type { IRoleRepository } from '@domain/repositories/role.repository.interface';
import type { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';

export interface ModuleAdminBootstrapConfig {
  email?: string;
}

export const BASE_ROLE_NAME = 'AUTHOR_RESEARCHER';
export const TOP_ROLE_NAME = 'BOOK_EDITOR';

/**
 * Seeds this module's bootstrap admin role assignments on boot from
 * SUPER_ADMIN_EMAIL, the eBook-module counterpart to the platform-wide
 * super-admin bootstrap in auth-service/user-service. See docs/erd.md
 * ("The bootstrap trick") for why this is seeded independently rather than
 * calling another service over HTTP (assigning BOOK_EDITOR normally
 * requires a BOOK_EDITOR token — a chicken-and-egg problem for the very
 * first one).
 *
 * Idempotent: safe to leave the env var set across every restart. Derives
 * the same deterministic userId computeBootstrapUserId() derives in every
 * other service and assigns it both this module's base role
 * (AUTHOR_RESEARCHER) and top role (BOOK_EDITOR), skipping any assignment
 * that already exists.
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
  for (const roleName of rolesToAssign) {
    const role = await roleRepo.findByName(roleName);
    if (!role) {
      logger.warn({ roleName }, 'Module-admin bootstrap: expected system role not found, skipping assignment — has the roles migration run?');
      continue;
    }

    const alreadyAssigned = await userRoleRepo.isAssigned(userId, role.id);
    if (alreadyAssigned) {
      logger.debug({ email, userId, roleName }, 'Module-admin bootstrap skipped: assignment already exists');
      continue;
    }

    await userRoleRepo.assign(userId, role.id, null);
  }

  logger.info({ email, userId, roles: rolesToAssign }, 'Bootstrapped module-admin role assignments');
}
