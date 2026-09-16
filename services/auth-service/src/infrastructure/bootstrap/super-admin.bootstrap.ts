import { logger } from '@common/logger/logger';
import { hashPassword } from '@common/utils/password.util';
import { computeBootstrapUserId } from '@common/utils/bootstrap-id.util';
import { AccountStatus } from '@domain/entities/user-credential.entity';
import type { IUserCredentialRepository } from '@domain/repositories/user-credential.repository.interface';

export interface SuperAdminBootstrapConfig {
  email?: string;
  password?: string;
}

/**
 * Seeds a super-admin login credential from SUPER_ADMIN_EMAIL /
 * SUPER_ADMIN_PASSWORD on boot, so a fresh deployment always has a working
 * admin account without anyone hand-editing the database or fighting the
 * chicken-and-egg problem where assigning the ADMIN role itself requires
 * an ADMIN token.
 *
 * Idempotent by design: safe to leave the env vars set permanently across
 * every restart. It looks the account up by email first and does nothing
 * if it already exists — this only ever creates the account once.
 *
 * See user-service's identical-in-spirit bootstrap
 * (src/infrastructure/bootstrap/super-admin.bootstrap.ts there) for the
 * profile-side half of this seed. Both compute the same user id via
 * computeBootstrapUserId() so the two independently-seeded rows line up.
 */
export async function bootstrapSuperAdmin(
  userCredentialRepo: IUserCredentialRepository,
  config: SuperAdminBootstrapConfig,
): Promise<void> {
  if (!config.email || !config.password) {
    logger.debug('Super-admin bootstrap skipped: SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD not set');
    return;
  }

  const email = config.email.trim().toLowerCase();
  const existing = await userCredentialRepo.findByEmail(email);
  if (existing) {
    logger.debug({ email }, 'Super-admin bootstrap skipped: account already exists');
    return;
  }

  const userId = computeBootstrapUserId(email);
  const passwordHash = await hashPassword(config.password);

  await userCredentialRepo.create({
    userId,
    email,
    passwordHash,
    roles: ['ADMIN', 'USER'],
    accountStatus: AccountStatus.ACTIVE,
  });

  logger.info({ email, userId }, 'Bootstrapped super-admin login credential');
}
