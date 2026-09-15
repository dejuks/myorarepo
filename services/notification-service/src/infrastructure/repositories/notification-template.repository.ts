import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { NotificationTemplate } from '@domain/entities/notification-template.entity';
import { NotificationChannel } from '@domain/entities/notification.entity';
import { INotificationTemplateRepository } from '@domain/repositories/notification-template.repository.interface';

export class NotificationTemplateRepository implements INotificationTemplateRepository {
  private readonly repo: Repository<NotificationTemplate>;

  constructor() {
    this.repo = AppDataSource.getRepository(NotificationTemplate);
  }

  async findByCodeAndChannel(code: string, channel: NotificationChannel): Promise<NotificationTemplate | null> {
    return this.repo.findOneBy({ code, channel, isActive: true });
  }

  async findById(id: string): Promise<NotificationTemplate | null> {
    return this.repo.findOneBy({ id });
  }

  async create(entity: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const created = this.repo.create(entity);
    return this.repo.save(created);
  }

  async update(id: string, changes: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    await this.repo.update({ id }, changes);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`NotificationTemplate ${id} not found after update`);
    return updated;
  }

  async listAll(): Promise<NotificationTemplate[]> {
    return this.repo.find({ order: { code: 'ASC', channel: 'ASC' } });
  }
}
