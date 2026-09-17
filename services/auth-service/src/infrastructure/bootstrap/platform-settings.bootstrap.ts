import { logger } from '@common/logger/logger';
import type { IPlatformSettingsRepository } from '@domain/repositories/platform-settings.repository.interface';

/**
 * Seeds the single platform_settings row on first boot, using the
 * REQUIRE_EMAIL_VERIFICATION env var as the INITIAL value only — after
 * this runs once, the env var is no longer consulted at all; the DB row is
 * the sole source of truth, and the super-admin can flip it at runtime via
 * PATCH /auth/settings (see AuthService.updatePlatformSettings and
 * web/src/pages/PlatformSettingsPage.tsx) without a redeploy or restart.
 *
 * Idempotent like every other bootstrap in this codebase: no-ops if the
 * row already exists, so it's safe to leave running on every restart.
 */
export async function bootstrapPlatformSettings(
  settingsRepo: IPlatformSettingsRepository,
  initialRequireEmailVerification: boolean,
): Promise<void> {
  const existing = await settingsRepo.get();
  if (existing) {
    logger.debug('Platform-settings bootstrap skipped: row already exists');
    return;
  }

  await settingsRepo.seed({ requireEmailVerification: initialRequireEmailVerification });
  logger.info({ requireEmailVerification: initialRequireEmailVerification }, 'Seeded platform_settings row');
}
