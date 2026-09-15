import { INotificationRepository, ListNotificationsFilter, PaginatedResult } from '@domain/repositories/notification.repository.interface';
import { Notification } from '@domain/entities/notification.entity';
import { NotFoundError, ForbiddenError } from '@common/errors/app-error';

/** Read side for a user's own in-app notification feed. */
export class NotificationQueryService {
  constructor(private readonly notificationRepo: INotificationRepository) {}

  async listForUser(filter: ListNotificationsFilter): Promise<PaginatedResult<Notification>> {
    return this.notificationRepo.listForUser(filter);
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationRepo.countUnreadForUser(userId);
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    const notification = await this.notificationRepo.findById(id);
    if (!notification) throw new NotFoundError('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenError('This notification does not belong to you');

    await this.notificationRepo.markRead(id);
  }

  async markAllAsRead(userId: string): Promise<number> {
    return this.notificationRepo.markAllReadForUser(userId);
  }
}
