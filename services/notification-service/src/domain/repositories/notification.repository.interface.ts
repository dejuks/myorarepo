import { Notification, NotificationStatus } from '@domain/entities/notification.entity';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListNotificationsFilter {
  userId: string;
  unreadOnly?: boolean;
  page: number;
  pageSize: number;
}

export interface INotificationRepository {
  create(entity: Partial<Notification>): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  updateStatus(id: string, status: NotificationStatus, errorMessage?: string | null): Promise<void>;
  markRead(id: string): Promise<void>;
  markAllReadForUser(userId: string): Promise<number>;
  listForUser(filter: ListNotificationsFilter): Promise<PaginatedResult<Notification>>;
  countUnreadForUser(userId: string): Promise<number>;
}
