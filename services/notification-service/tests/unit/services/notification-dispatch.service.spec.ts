import { NotificationDispatchService } from '@application/services/notification-dispatch.service';
import { NotificationChannel, NotificationStatus } from '@domain/entities/notification.entity';
import {
  FakeNotificationRepository,
  FakeNotificationTemplateRepository,
  FakeUserContactCacheRepository,
  FakeEmailProvider,
} from './fakes';

jest.mock('@infrastructure/messaging/rabbitmq.publisher', () => ({
  rabbitMqPublisher: { publish: jest.fn().mockResolvedValue(undefined) },
}));

describe('NotificationDispatchService', () => {
  let notificationRepo: FakeNotificationRepository;
  let templateRepo: FakeNotificationTemplateRepository;
  let contactCacheRepo: FakeUserContactCacheRepository;
  let emailProvider: FakeEmailProvider;
  let service: NotificationDispatchService;

  beforeEach(() => {
    notificationRepo = new FakeNotificationRepository();
    templateRepo = new FakeNotificationTemplateRepository();
    contactCacheRepo = new FakeUserContactCacheRepository();
    emailProvider = new FakeEmailProvider();
    service = new NotificationDispatchService(notificationRepo, templateRepo, contactCacheRepo, emailProvider);

    templateRepo.seed([
      { code: 'WELCOME', channel: NotificationChannel.EMAIL, subject: 'Welcome {{firstName}}', bodyTemplate: 'Hi {{firstName}}, welcome to ORA ({{email}}).' },
      { code: 'WELCOME', channel: NotificationChannel.IN_APP, bodyTemplate: 'Welcome to ORA!' },
      { code: 'PASSWORD_RESET_REQUESTED', channel: NotificationChannel.EMAIL, subject: 'Reset', bodyTemplate: 'Code: {{resetToken}}' },
    ]);
  });

  it('dispatches to every channel mapped for the event type, rendering templates from the payload', async () => {
    await service.dispatchEvent({
      eventType: 'auth.registered',
      payload: { userId: 'user-1', email: 'new@example.com', firstName: 'Ada' },
    });

    const rows = [...notificationRepo.rows.values()];
    expect(rows).toHaveLength(2); // EMAIL + IN_APP per event-template-map

    const emailRow = rows.find((r) => r.channel === NotificationChannel.EMAIL)!;
    expect(emailRow.subject).toBe('Welcome Ada');
    expect(emailRow.body).toContain('new@example.com');
    expect(emailRow.status).toBe(NotificationStatus.SENT);
    expect(emailProvider.sent).toHaveLength(1);
    expect(emailProvider.sent[0].to).toBe('new@example.com');

    const inAppRow = rows.find((r) => r.channel === NotificationChannel.IN_APP)!;
    expect(inAppRow.status).toBe(NotificationStatus.SENT);
  });

  it('falls back to the contact cache for the recipient email when the event payload has none', async () => {
    await contactCacheRepo.upsert('user-2', { email: 'cached@example.com' });

    await service.dispatchEvent({
      eventType: 'auth.password.reset_requested',
      payload: { userId: 'user-2', resetToken: 'abc123' },
    });

    expect(emailProvider.sent).toHaveLength(1);
    expect(emailProvider.sent[0].to).toBe('cached@example.com');
    expect(emailProvider.sent[0].body).toContain('abc123');
  });

  it('marks the notification FAILED when no email is available anywhere', async () => {
    await service.dispatchEvent({
      eventType: 'auth.password.reset_requested',
      payload: { userId: 'user-no-email', resetToken: 'xyz' },
    });

    const row = [...notificationRepo.rows.values()][0];
    expect(row.status).toBe(NotificationStatus.FAILED);
    expect(row.errorMessage).toMatch(/no email/i);
  });

  it('marks the notification FAILED when the email provider throws', async () => {
    emailProvider.shouldFail = true;

    await service.dispatchEvent({
      eventType: 'auth.password.reset_requested',
      payload: { userId: 'user-3', email: 'fail@example.com', resetToken: 'zzz' },
    });

    const row = [...notificationRepo.rows.values()][0];
    expect(row.status).toBe(NotificationStatus.FAILED);
    expect(row.errorMessage).toContain('Simulated email provider failure');
  });

  it('ignores event types with no mapping', async () => {
    await service.dispatchEvent({ eventType: 'some.unmapped.event', payload: { userId: 'user-4' } });
    expect(notificationRepo.rows.size).toBe(0);
  });

  it('ignores events with no userId in the payload', async () => {
    await service.dispatchEvent({ eventType: 'auth.registered', payload: { email: 'noid@example.com' } });
    expect(notificationRepo.rows.size).toBe(0);
  });

  it('skips a channel silently when no active template exists for it', async () => {
    // ROLE_ASSIGNED maps only to IN_APP but we haven't seeded a template for it.
    await service.dispatchEvent({ eventType: 'user.role_assigned', payload: { userId: 'user-5', role: 'RESEARCHER' } });
    expect(notificationRepo.rows.size).toBe(0);
  });
});
