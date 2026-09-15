import { NotificationQueryService } from '@application/services/notification-query.service';
import { NotificationChannel } from '@domain/entities/notification.entity';
import { FakeNotificationRepository } from './fakes';

describe('NotificationQueryService', () => {
  let notificationRepo: FakeNotificationRepository;
  let service: NotificationQueryService;

  beforeEach(() => {
    notificationRepo = new FakeNotificationRepository();
    service = new NotificationQueryService(notificationRepo);
  });

  it('lists only the requesting user\'s notifications, paginated', async () => {
    await notificationRepo.create({ userId: 'user-1', channel: NotificationChannel.IN_APP, templateCode: 'X', body: 'a' });
    await notificationRepo.create({ userId: 'user-1', channel: NotificationChannel.IN_APP, templateCode: 'X', body: 'b' });
    await notificationRepo.create({ userId: 'user-2', channel: NotificationChannel.IN_APP, templateCode: 'X', body: 'c' });

    const result = await service.listForUser({ userId: 'user-1', page: 1, pageSize: 20 });
    expect(result.total).toBe(2);
    expect(result.items.every((n) => n.userId === 'user-1')).toBe(true);
  });

  it('filters to unread only when requested', async () => {
    const read = await notificationRepo.create({ userId: 'user-1', channel: NotificationChannel.IN_APP, templateCode: 'X', body: 'a' });
    await notificationRepo.markRead(read.id);
    await notificationRepo.create({ userId: 'user-1', channel: NotificationChannel.IN_APP, templateCode: 'X', body: 'b' });

    const result = await service.listForUser({ userId: 'user-1', unreadOnly: true, page: 1, pageSize: 20 });
    expect(result.total).toBe(1);
  });

  it('marks a notification read only for its owner', async () => {
    const notification = await notificationRepo.create({ userId: 'user-1', channel: NotificationChannel.IN_APP, templateCode: 'X', body: 'a' });

    await expect(service.markAsRead(notification.id, 'someone-else')).rejects.toMatchObject({ statusCode: 403 });

    await service.markAsRead(notification.id, 'user-1');
    const updated = await notificationRepo.findById(notification.id);
    expect(updated?.readAt).not.toBeNull();
  });

  it('throws NotFoundError for a nonexistent notification', async () => {
    await expect(service.markAsRead('nonexistent', 'user-1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('marks all of a user\'s notifications read and reports the count', async () => {
    await notificationRepo.create({ userId: 'user-1', channel: NotificationChannel.IN_APP, templateCode: 'X', body: 'a' });
    await notificationRepo.create({ userId: 'user-1', channel: NotificationChannel.IN_APP, templateCode: 'X', body: 'b' });

    const count = await service.markAllAsRead('user-1');
    expect(count).toBe(2);
    expect(await service.countUnread('user-1')).toBe(0);
  });
});
