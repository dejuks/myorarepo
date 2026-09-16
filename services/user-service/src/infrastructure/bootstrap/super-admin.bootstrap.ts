import { logger } from '@common/logger/logger';
import { computeBootstrapUserId } from '@common/utils/bootstrap-id.util';
import { UserStatus } from '@domain/entities/user.entity';
import { DEFAULT_ROLE_NAME } from '@application/services/user.service';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type { IRoleRepository } from '@domain/repositories/role.repository.interface';
import type { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';

export interface SuperAdminBootstrapConfig {
  email?: string;
  firstName?: string;
  lastName?: string;
}

const ADMIN_ROLE_NAME = 'ADMIN';

/**
 * Seeds the super-admin's profile record and ADMIN role assignment on
 * boot from SUPER_ADMIN_EMAIL (+ optional name fields), the profile-side
 * counterpart to auth-service's identically-named bootstrap module, which
 * seeds the matching login credential. See that module's doc comment for
 * why the two are seeded independently rather than one calling the other
 * over HTTP (assigning ADMIN normally requires an ADMIN token — a
 * chicken-and-egg problem for the very first admin).
 *
 * Idempotent: safe to leave the env var set across every restart. Looks
 * the profile up by the same deterministic id computeBootstrapUserId()
 * derives in auth-service, and does nothing if it already exists.
 */
export async function bootstrapSuperAdmin(
  userRepo: IUserRepository,
  roleRepo: IRoleRepository,
  userRoleRepo: IUserRoleAssignmentRepository,
  config: SuperAdminBootstrapConfig,
): Promise<void> {
  if (!config.email) {
    logger.debug('Super-admin bootstrap skipped: SUPER_ADMIN_EMAIL not set');
    return;
  }

  const email = config.email.trim().toLowerCase();
  const userId = computeBootstrapUserId(email);

  const existing = await userRepo.findById(userId);
  if (existing) {
    logger.debug({ email, userId }, 'Super-admin bootstrap skipped: profile already exists');
    return;
  }

  const user = await userRepo.create({
    id: userId,
    email,
    firstName: config.firstName?.trim() || 'Super',
    lastName: config.lastName?.trim() || 'Admin',
    locale: 'en',
    status: UserStatus.ACTIVE,
  });

  const rolesToAssign = [DEFAULT_ROLE_NAME, ADMIN_ROLE_NAME];
  for (const roleName of rolesToAssign) {
    const role = await roleRepo.findByName(roleName);
    if (!role) {
      logger.warn({ roleName }, 'Super-admin bootstrap: expected system role not found, skipping assignment — has the roles migration run?');
      continue;
    }
    await userRoleRepo.assign(user.id, role.id, null);
  }

  logger.info({ email, userId, roles: rolesToAssign }, 'Bootstrapped super-admin profile and role assignment');
}
