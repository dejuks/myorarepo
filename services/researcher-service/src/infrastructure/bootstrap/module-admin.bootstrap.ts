import { logger } from '@common/logger/logger';
import { computeBootstrapUserId } from '@common/utils/bootstrap-id.util';
import type { IRoleRepository } from '@domain/repositories/role.repository.interface';
import type { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';

export interface ModuleAdminBootstrapConfig {
  email?: string;
}

const BASE_ROLE_NAME = 'RESEARCHER_MEMBER';
const TOP_ROLE_NAME = 'PLATFORM_ADMINISTRATOR';

/**
 * Same chicken-and-egg problem as the platform-wide super-admin: the very
 * first person able to assign roles in this module needs a role already
 * assigned by *someone*. Solved exactly like `user-service`'s
 * `super-admin.bootstrap.ts`: an idempotent function run once at startup
 * that, if `SUPER_ADMIN_EMAIL` is set, computes `computeBootstrapUserId(email)`
 * (the same deterministic UUID v5 every service in the platform uses for
 * this email) and assigns that userId BOTH the module's base role
 * (RESEARCHER_MEMBER) AND its top role (PLATFORM_ADMINISTRATOR) — a no-op,
 * logged at debug, if the assignment already exists (idempotent).
 *
 * `config` is taken as an explicit parameter (NOT read from the `env`
 * singleton inside the function) — required for testability, exactly as
 * documented in user-service's and auth-service's bootstrap files (envalid's
 * `cleanEnv` computes `env` once at import time, so reading it inside a
 * function you want to unit-test with different values per test doesn't
 * work). `env.SUPER_ADMIN_EMAIL` is read at the call site in server.ts
 * instead, same as the other two services do.
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
  let assignedAny = false;

  for (const roleName of rolesToAssign) {
    const role = await roleRepo.findByName(roleName);
    if (!role) {
      logger.warn({ roleName }, 'Module-admin bootstrap: expected system role not found, skipping assignment — has the roles migration run?');
      continue;
    }

    const already = await userRoleRepo.isAssigned(userId, role.id);
    if (already) {
      logger.debug({ email, userId, roleName }, 'Module-admin bootstrap: role assignment already exists, skipping');
      continue;
    }

    await userRoleRepo.assign(userId, role.id, null);
    assignedAny = true;
  }

  if (assignedAny) {
    logger.info({ email, userId, roles: rolesToAssign }, 'Bootstrapped module-admin role assignments');
  }
}
