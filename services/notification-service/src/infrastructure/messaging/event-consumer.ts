import amqplib, { ChannelModel, ConsumeMessage } from 'amqplib';
import { env } from '@config/env';
import { logger } from '@common/logger/logger';
import { NotificationDispatchService } from '@application/services/notification-dispatch.service';
import { ContactCacheService } from '@application/services/contact-cache.service';

interface EventEnvelope {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  producer: string;
  payload: Record<string, unknown>;
}

const EXCHANGES_TO_CONSUME = [
  { exchange: env.AUTH_EXCHANGE, queueSuffix: 'auth-events' },
  { exchange: env.USER_EXCHANGE, queueSuffix: 'user-events' },
];

/**
 * Subscribes to every other service's topic exchange and routes inbound
 * events to NotificationDispatchService (to trigger notifications) and
 * ContactCacheService (to keep the local email/phone read-model current).
 * One durable queue per upstream exchange, bound with '#' (all routing
 * keys) since this service wants to observe everything and decides per
 * event type whether it's actionable — see event-template-map.ts.
 */
export class NotificationEventConsumer {
  private connection: ChannelModel | null = null;

  constructor(
    private readonly dispatchService: NotificationDispatchService,
    private readonly contactCacheService: ContactCacheService,
  ) {}

  async start(): Promise<void> {
    try {
      this.connection = await amqplib.connect(env.RABBITMQ_URL);
      this.connection.on('error', (err) => logger.error({ err }, 'RabbitMQ consumer connection error'));
      this.connection.on('close', () => logger.warn('RabbitMQ consumer connection closed'));

      for (const { exchange, queueSuffix } of EXCHANGES_TO_CONSUME) {
        await this.bindAndConsume(exchange, `${env.SERVICE_NAME}.${queueSuffix}.q`);
      }

      logger.info('Notification event consumer subscribed to all upstream exchanges');
    } catch (err) {
      logger.error({ err }, 'Failed to start notification event consumer — notifications driven by events will not fire');
    }
  }

  private async bindAndConsume(exchange: string, queueName: string): Promise<void> {
    if (!this.connection) return;
    const channel = await this.connection.createChannel();

    await channel.assertExchange(exchange, 'topic', { durable: true });
    const dlx = `${exchange}.dlx`;
    await channel.assertExchange(dlx, 'topic', { durable: true });
    await channel.assertQueue(`${queueName}.dlq`, { durable: true });
    await channel.bindQueue(`${queueName}.dlq`, dlx, '#');

    await channel.assertQueue(queueName, { durable: true, arguments: { 'x-dead-letter-exchange': dlx } });
    await channel.bindQueue(queueName, exchange, '#');
    await channel.prefetch(10);

    await channel.consume(queueName, (msg) => this.handleMessage(channel, msg), { noAck: false });
    logger.info({ exchange, queueName }, 'Bound and consuming');
  }

  private async handleMessage(channel: amqplib.Channel, msg: ConsumeMessage | null): Promise<void> {
    if (!msg) return;

    try {
      const envelope = JSON.parse(msg.content.toString()) as EventEnvelope;

      // Keep the local contact cache current on any event carrying an email/phone.
      const userId = envelope.payload.userId as string | undefined;
      if (userId && (envelope.payload.email || envelope.payload.phone)) {
        await this.contactCacheService.upsertFromEvent(userId, {
          email: envelope.payload.email as string | undefined,
          phone: envelope.payload.phone as string | undefined,
        });
      }

      await this.dispatchService.dispatchEvent({ eventType: envelope.eventType, payload: envelope.payload });

      channel.ack(msg);
    } catch (err) {
      logger.error({ err }, 'Failed to process inbound event — sending to dead-letter queue');
      channel.nack(msg, false, false); // routed to the queue's DLX per bindAndConsume
    }
  }

  async stop(): Promise<void> {
    await this.connection?.close();
  }
}
