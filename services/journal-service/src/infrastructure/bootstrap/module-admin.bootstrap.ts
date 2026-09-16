import { logger } from '@common/logger/logger';
import { computeBootstrapUserId } from '@common/utils/bootstrap-id.util';
import type { IRoleRepository } from '@domain/repositories/role.repository.interface';
import type { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';

export interface ModuleAdminBootstrapConfig {
  email?: string;
}

const BASE_ROLE_NAME = 'AUTHOR';
const TOP_ROLE_NAME = 'JOURNAL_MANAGER';

/**
 * Seeds the module admin's role assignments on boot from SUPER_ADMIN_EMAIL,
 * the journal-module counterpart to the platform-wide super-admin bootstrap
 * that user-service/auth-service run. This service has no User entity of
 * its own — userId is an opaque cross-service reference — so there is no
 * profile record to create here, only role assignments.
 *
 * Same chicken-and-egg problem as the platform-wide super-admin: the very
 * first person able to assign roles in this module needs a role already
 * assigned by *someone*. Solves it exactly like user-service's
 * super-admin.bootstrap.ts: computes the deterministic UUID v5 platform user
 * id for the email (same namespace constant every service uses) and assigns
 * that userId BOTH the module's base role (AUTHOR) and its top role
 * (JOURNAL_MANAGER).
 *
 * Idempotent: safe to leave the env var set across every restart — each
 * assignment is skipped (logged at debug) if it already exists. If a role
 * doesn't exist in the DB yet (migrations not run), that assignment is
 * skipped with a logger.warn rather than throwing.
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
      logger.debug({ email, userId, roleName }, 'Module-admin bootstrap skipped: role already assigned');
      continue;
    }

    await userRoleRepo.assign(userId, role.id, null);
  }

  logger.info({ email, userId, roles: rolesToAssign }, 'Bootstrapped module-admin role assignments');
}
