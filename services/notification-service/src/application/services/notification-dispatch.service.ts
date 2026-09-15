import { INotificationRepository } from '@domain/repositories/notification.repository.interface';
import { INotificationTemplateRepository } from '@domain/repositories/notification-template.repository.interface';
import { IUserContactCacheRepository } from '@domain/repositories/user-contact-cache.repository.interface';
import { NotificationChannel, NotificationStatus } from '@domain/entities/notification.entity';
import { IEmailProvider } from '@infrastructure/providers/email-provider.interface';
import { renderTemplate } from '@common/utils/template-renderer.util';
import { EVENT_TEMPLATE_MAP } from '@application/services/event-template-map';
import { rabbitMqPublisher } from '@infrastructure/messaging/rabbitmq.publisher';
import { logger } from '@common/logger/logger';

export interface InboundDomainEvent {
  eventType: string;
  payload: Record<string, unknown>;
}

/**
 * Turns an inbound domain event into one or more rendered, delivered
 * notifications. This is the core use case of the service — everything
 * else (REST endpoints, the RabbitMQ consumer) is a thin adapter calling
 * into this class, which depends only on repository/provider INTERFACES
 * and is therefore fully unit-testable with fakes.
 */
export class NotificationDispatchService {
  constructor(
    private readonly notificationRepo: INotificationRepository,
    private readonly templateRepo: INotificationTemplateRepository,
    private readonly contactCacheRepo: IUserContactCacheRepository,
    private readonly emailProvider: IEmailProvider,
  ) {}

  async dispatchEvent(event: InboundDomainEvent): Promise<void> {
    const mapping = EVENT_TEMPLATE_MAP[event.eventType];
    if (!mapping) {
      logger.debug({ eventType: event.eventType }, 'No notification mapping for this event type — ignored');
      return;
    }

    const userId = event.payload.userId as string | undefined;
    if (!userId) {
      logger.warn({ eventType: event.eventType }, 'Event has no userId in payload — cannot dispatch notification');
      return;
    }

    for (const channel of mapping.channels) {
      await this.dispatchOne(userId, channel, mapping.templateCode, event.payload).catch((err) => {
        logger.error({ err, userId, channel, templateCode: mapping.templateCode }, 'Failed to dispatch notification');
      });
    }
  }

  private async dispatchOne(
    userId: string,
    channel: NotificationChannel,
    templateCode: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const template = await this.templateRepo.findByCodeAndChannel(templateCode, channel);
    if (!template) {
      logger.warn({ templateCode, channel }, 'No active template found — skipping this channel');
      return;
    }

    const subject = template.subject ? renderTemplate(template.subject, data) : null;
    const body = renderTemplate(template.bodyTemplate, data);

    const notification = await this.notificationRepo.create({
      userId,
      channel,
      templateCode,
      subject,
      body,
      status: NotificationStatus.PENDING,
      metadata: data,
    });

    if (channel === NotificationChannel.IN_APP) {
      // In-app notifications are "sent" the moment they're persisted — the client reads them via GET /notifications.
      await this.notificationRepo.updateStatus(notification.id, NotificationStatus.SENT);
      await rabbitMqPublisher.publish('notification.sent', { notificationId: notification.id, userId, channel });
      return;
    }

    if (channel === NotificationChannel.EMAIL) {
      const email = (data.email as string | undefined) ?? (await this.contactCacheRepo.findByUserId(userId))?.email;
      if (!email) {
        await this.notificationRepo.updateStatus(notification.id, NotificationStatus.FAILED, 'No email address on file for this user');
        return;
      }
      try {
        await this.emailProvider.send({ to: email, subject: subject ?? '(no subject)', body });
        await this.notificationRepo.updateStatus(notification.id, NotificationStatus.SENT);
        await rabbitMqPublisher.publish('notification.sent', { notificationId: notification.id, userId, channel });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown email delivery error';
        await this.notificationRepo.updateStatus(notification.id, NotificationStatus.FAILED, message);
        await rabbitMqPublisher.publish('notification.failed', { notificationId: notification.id, userId, channel, error: message });
      }
      return;
    }

    // SMS / PUSH: same shape as EMAIL, wired to a provider once one exists (Phase 3+) — placeholder for now.
    logger.info({ channel, templateCode }, 'Channel has no delivery provider yet — notification recorded as PENDING');
  }
}
