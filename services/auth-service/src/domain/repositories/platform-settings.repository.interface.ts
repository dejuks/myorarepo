import { PlatformSetting } from '@domain/entities/platform-setting.entity';

export interface IPlatformSettingsRepository {
  /** Reads the single settings row. Never null once the bootstrap seed has run (see server.ts). */
  get(): Promise<PlatformSetting | null>;
  /** Creates the single settings row (id=1) — only ever called by the bootstrap seed on first boot. */
  seed(defaults: Partial<PlatformSetting>): Promise<PlatformSetting>;
  /** Updates the single settings row (id=1). */
  update(changes: Partial<PlatformSetting>): Promise<PlatformSetting>;
}
