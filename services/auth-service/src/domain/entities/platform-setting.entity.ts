import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * A single-row table holding platform-wide, runtime-toggleable settings —
 * currently just REQUIRE_EMAIL_VERIFICATION. Unlike most config in this
 * codebase (env vars, fixed at deploy time), this is meant to be flipped by
 * the platform super-admin from the UI without a redeploy or restart — see
 * AuthService.getPlatformSettings/updatePlatformSettings and
 * web/src/pages/PlatformSettingsPage.tsx.
 *
 * `id` is pinned to 1 by the CHECK constraint added in the migration, so
 * there is always exactly one row — repositories always read/write that
 * one row rather than doing any kind of lookup.
 */
@Entity({ name: 'platform_settings' })
export class PlatformSetting {
  @PrimaryColumn({ type: 'smallint', default: 1 })
  id!: number;

  /**
   * Whether a newly created account (self-registered or admin/module-admin
   * -created) must verify its email before it can log in. Seeded once at
   * first boot from the REQUIRE_EMAIL_VERIFICATION env var (see
   * infrastructure/bootstrap/platform-settings.bootstrap.ts) — after that,
   * this DB value is the source of truth, not the env var, so an admin can
   * change it at runtime for every user without anyone touching config or
   * restarting the service.
   */
  @Column({ name: 'require_email_verification', type: 'boolean', default: true })
  requireEmailVerification!: boolean;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
