import { logger } from '@common/logger/logger';
import { computeBootstrapUserId } from '@common/utils/bootstrap-id.util';
import type { IRoleRepository } from '@domain/repositories/role.repository.interface';
import type { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';

export interface ModuleAdminBootstrapConfig {
  email?: string;
}

/** The module's BASE_ROLE — assigned to every depositing researcher/author. */
const BASE_ROLE_NAME = 'RESEARCHER_AUTHOR';
/** The module's TOP_ROLE — the only role allowed to create/delete custom roles and assign/revoke roles. */
const TOP_ROLE_NAME = 'REPOSITORY_ADMINISTRATOR';

/**
 * Same chicken-and-egg problem as the platform-wide super-admin bootstrap
 * (see user-service's super-admin.bootstrap.ts): the very first person able
 * to assign roles in this module needs a role already assigned by *someone*.
 * Solved the same way, entirely locally to this service's own database —
 * this module never calls user-service or auth-service over HTTP.
 *
 * If SUPER_ADMIN_EMAIL is set, computes the same deterministic UUID v5
 * (computeBootstrapUserId) every service in the platform derives for that
 * email, and assigns that userId both the module's BASE_ROLE and its
 * TOP_ROLE. Idempotent: a role already assigned is skipped (logged at
 * debug), and a role not yet in the DB (migrations not run) is skipped with
 * a warning rather than throwing.
 *
 * Takes `config` as an explicit parameter (NOT read from the `env`
 * singleton inside the function) — required for testability, since
 * envalid's `cleanEnv` computes `env` once at import time. Read
 * `env.SUPER_ADMIN_EMAIL` at the call site in server.ts instead.
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
      logger.debug({ email, userId, roleName }, 'Module-admin bootstrap: role assignment already exists, skipping');
      continue;
    }

    await userRoleRepo.assign(userId, role.id, null);
  }

  logger.info({ email, userId, roles: rolesToAssign }, 'Bootstrapped module-admin role assignments');
}
