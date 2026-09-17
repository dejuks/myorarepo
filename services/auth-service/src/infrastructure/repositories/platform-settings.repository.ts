import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { PlatformSetting } from '@domain/entities/platform-setting.entity';
import { IPlatformSettingsRepository } from '@domain/repositories/platform-settings.repository.interface';

const SETTINGS_ROW_ID = 1;

export class PlatformSettingsRepository implements IPlatformSettingsRepository {
  private readonly repo: Repository<PlatformSetting>;

  constructor() {
    this.repo = AppDataSource.getRepository(PlatformSetting);
  }

  async get(): Promise<PlatformSetting | null> {
    return this.repo.findOneBy({ id: SETTINGS_ROW_ID });
  }

  async seed(defaults: Partial<PlatformSetting>): Promise<PlatformSetting> {
    const created = this.repo.create({ ...defaults, id: SETTINGS_ROW_ID });
    return this.repo.save(created);
  }

  async update(changes: Partial<PlatformSetting>): Promise<PlatformSetting> {
    await this.repo.update({ id: SETTINGS_ROW_ID }, changes);
    const updated = await this.get();
    if (!updated) throw new Error('platform_settings row is missing — bootstrap did not run');
    return updated;
  }
}
