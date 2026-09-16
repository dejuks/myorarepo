import { logger } from '@common/logger/logger';
import { computeBootstrapUserId } from '@common/utils/bootstrap-id.util';
import type { IRoleRepository } from '@domain/repositories/role.repository.interface';
import type { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';

export interface ModuleAdminBootstrapConfig {
  email?: string;
}

/** This module's base role — assigned automatically alongside the top role when the platform super-admin is bootstrapped. */
const BASE_ROLE_NAME = 'REGISTERED_EDITOR';
/** This module's top role — the only role allowed to create/delete custom roles and assign/revoke roles for other members. */
const TOP_ROLE_NAME = 'BUREAUCRAT';

/**
 * Same chicken-and-egg problem as the platform-wide super-admin: the very
 * first person able to assign roles in this module needs a role already
 * assigned by *someone*. Solved exactly like user-service's
 * super-admin.bootstrap.ts: an idempotent function run once at startup
 * that, if SUPER_ADMIN_EMAIL is set, computes computeBootstrapUserId(email)
 * (the same deterministic UUID v5 every service in the platform uses for
 * this email) and assigns that userId BOTH the module's base role and its
 * top role — skipping entirely (no-op, logged at debug) if the assignment
 * already exists.
 *
 * `config` is taken as an explicit parameter (NOT read from the `env`
 * singleton inside the function) for testability — envalid's `cleanEnv`
 * computes `env` once at import time, so reading it inside a function you
 * want to unit-test with different values per test doesn't work. Read
 * env.SUPER_ADMIN_EMAIL at the call site in server.ts instead.
 *
 * This service has no User entity, so unlike user-service's bootstrap,
 * there is no profile row to create here — only role assignments against
 * the opaque, deterministically-derived userId.
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

    const already = await userRoleRepo.isAssigned(userId, role.id);
    if (already) {
      logger.debug({ email, userId, roleName }, 'Module-admin bootstrap skipped: role already assigned');
      continue;
    }

    await userRoleRepo.assign(userId, role.id, null);
    assigned.push(roleName);
  }

  if (assigned.length > 0) {
    logger.info({ email, userId, roles: assigned }, 'Bootstrapped module-admin role assignment(s)');
  }
}
