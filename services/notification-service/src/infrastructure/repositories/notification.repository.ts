import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { Notification, NotificationStatus } from '@domain/entities/notification.entity';
import {
  INotificationRepository,
  ListNotificationsFilter,
  PaginatedResult,
} from '@domain/repositories/notification.repository.interface';

export class NotificationRepository implements INotificationRepository {
  private readonly repo: Repository<Notification>;

  constructor() {
    this.repo = AppDataSource.getRepository(Notification);
  }

  async create(entity: Partial<Notification>): Promise<Notification> {
    const created = this.repo.create(entity);
    return this.repo.save(created);
  }

  async findById(id: string): Promise<Notification | null> {
    return this.repo.findOneBy({ id });
  }

  async updateStatus(id: string, status: NotificationStatus, errorMessage: string | null = null): Promise<void> {
    await this.repo.update(
      { id },
      { status, errorMessage, sentAt: status === NotificationStatus.SENT ? new Date() : undefined },
    );
  }

  async markRead(id: string): Promise<void> {
    await this.repo.update({ id }, { readAt: new Date() });
  }

  async markAllReadForUser(userId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('userId = :userId AND readAt IS NULL', { userId })
      .execute();
    return result.affected ?? 0;
  }

  async listForUser(filter: ListNotificationsFilter): Promise<PaginatedResult<Notification>> {
    const qb = this.repo.createQueryBuilder('n').where('n.userId = :userId', { userId: filter.userId });

    if (filter.unreadOnly) {
      qb.andWhere('n.readAt IS NULL');
    }

    qb.orderBy('n.createdAt', 'DESC')
      .skip((filter.page - 1) * filter.pageSize)
      .take(filter.pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: filter.page, pageSize: filter.pageSize };
  }

  async countUnreadForUser(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, readAt: undefined } });
  }
}
