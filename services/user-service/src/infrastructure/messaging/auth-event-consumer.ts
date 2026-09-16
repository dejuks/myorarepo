import amqplib, { ChannelModel, ConsumeMessage } from 'amqplib';
import { env } from '@config/env';
import { logger } from '@common/logger/logger';
import { UserService } from '@application/services/user.service';
import { UserStatus } from '@domain/entities/user.entity';
import { AppError, NotFoundError } from '@common/errors/app-error';

interface EventEnvelope {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  producer: string;
  payload: Record<string, unknown>;
}

const QUEUE_SUFFIX = 'auth-events';

/**
 * Subscribes to auth-service's `ora.auth.events` exchange so a profile
 * created via POST /users (which always starts life as PENDING, see
 * domain/entities/user.entity.ts) is automatically activated once the
 * matching login credentials exist in auth-service — there is no separate
 * email-verification step in this platform today, so "credentials were
 * successfully registered" IS the activation signal. This is deliberately
 * async/eventually-consistent (same pattern as every other cross-service
 * reaction in this platform, see docs/01-architecture.md §5) rather than a
 * new synchronous call back into user-service, which would need a whole
 * new internal-service auth mechanism (auth-service has no user JWT yet at
 * registration time) for a one-field update that can tolerate a short
 * delay.
 *
 * One durable queue bound to auth-service's exchange with '#' (mirrors
 * notification-service's NotificationEventConsumer) — only `auth.registered`
 * is acted on today; every other routing key on that exchange is ignored,
 * not an error, so this consumer never needs to change just because
 * auth-service adds new event types.
 */
export class AuthEventConsumer {
  private connection: ChannelModel | null = null;

  constructor(private readonly userService: UserService) {}

  async start(): Promise<void> {
    try {
      this.connection = await amqplib.connect(env.RABBITMQ_URL);
      this.connection.on('error', (err) => logger.error({ err }, 'RabbitMQ consumer connection error'));
      this.connection.on('close', () => logger.warn('RabbitMQ consumer connection closed'));

      await this.bindAndConsume(env.AUTH_EXCHANGE, `${env.SERVICE_NAME}.${QUEUE_SUFFIX}.q`);

      logger.info({ exchange: env.AUTH_EXCHANGE }, 'Auth event consumer subscribed');
    } catch (err) {
      logger.error({ err }, 'Failed to start auth event consumer — new accounts will stay PENDING until an admin activates them manually');
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

      if (envelope.eventType === 'auth.registered') {
        await this.handleAuthRegistered(envelope);
      }
      // Every other routing key on this exchange is intentionally ignored.

      channel.ack(msg);
    } catch (err) {
      if (err instanceof NotFoundError) {
        // The profile hasn't landed yet relative to this event (should be rare — the
        // registration flow always creates the profile via POST /users before calling
        // POST /auth/register) or it was deleted. Not retryable by redelivery timing
        // alone; dead-letter it so it's visible rather than looping forever.
        logger.warn({ err }, 'auth.registered referenced a user profile that does not exist — dead-lettering');
      } else if (err instanceof AppError) {
        // e.g. the user is already SUSPENDED/DEACTIVATED — a terminal or conflicting
        // state that redelivery cannot fix. Log and drop rather than retry forever.
        logger.warn({ err }, 'Could not auto-activate user from auth.registered — dropping');
      } else {
        logger.error({ err }, 'Failed to process inbound auth event — sending to dead-letter queue');
      }
      channel.nack(msg, false, false); // routed to the queue's DLX per bindAndConsume
    }
  }

  private async handleAuthRegistered(envelope: EventEnvelope): Promise<void> {
    const userId = envelope.payload.userId as string | undefined;
    if (!userId) {
      logger.warn({ envelope }, 'auth.registered event missing userId — ignoring');
      return;
    }

    const user = await this.userService.getById(userId);
    if (user.status !== UserStatus.PENDING) {
      // Already activated (or moved past PENDING some other way) — a redelivered or
      // duplicate message is a no-op, not re-published as a fresh user.status_changed.
      logger.debug({ userId, status: user.status }, 'auth.registered received for a non-PENDING user — skipping');
      return;
    }

    await this.userService.changeStatus(
      userId,
      { status: UserStatus.ACTIVE, reason: 'Auto-activated: login credentials registered in auth-service' },
      'system:auth-event-consumer',
    );
    logger.info({ userId }, 'User auto-activated after auth.registered');
  }

  async stop(): Promise<void> {
    await this.connection?.close();
  }
}
