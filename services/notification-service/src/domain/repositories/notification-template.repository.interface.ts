import { NotificationChannel } from '@domain/entities/notification.entity';
import { NotificationTemplate } from '@domain/entities/notification-template.entity';

export interface INotificationTemplateRepository {
  findByCodeAndChannel(code: string, channel: NotificationChannel): Promise<NotificationTemplate | null>;
  findById(id: string): Promise<NotificationTemplate | null>;
  create(entity: Partial<NotificationTemplate>): Promise<NotificationTemplate>;
  update(id: string, changes: Partial<NotificationTemplate>): Promise<NotificationTemplate>;
  listAll(): Promise<NotificationTemplate[]>;
}
