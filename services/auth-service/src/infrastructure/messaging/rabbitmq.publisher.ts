import amqplib, { Channel, ChannelModel } from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { env } from '@config/env';
import { logger } from '@common/logger/logger';

/**
 * Thin wrapper around amqplib publishing to the service's topic exchange.
 * Mirrors the shared @ora/event-bus package contract described in Phase 1
 * (docs/01-architecture.md §6) — reimplemented locally here so this service
 * has zero cross-service source dependency for Phase 2 delivery.
 */
class RabbitMqPublisher {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  async connect(): Promise<void> {
    try {
      this.connection = await amqplib.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(env.RABBITMQ_EXCHANGE, 'topic', { durable: true });
      this.connection.on('error', (err) => logger.error({ err }, 'RabbitMQ connection error'));
      this.connection.on('close', () => logger.warn('RabbitMQ connection closed'));
      logger.info({ exchange: env.RABBITMQ_EXCHANGE }, 'Connected to RabbitMQ');
    } catch (err) {
      logger.error({ err }, 'Failed to connect to RabbitMQ — continuing without event publishing');
    }
  }

  async publish(routingKey: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.channel) {
      logger.warn({ routingKey }, 'RabbitMQ channel not available, event dropped');
      return;
    }
    const envelope = {
      eventId: uuidv4(),
      eventType: routingKey,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      producer: env.SERVICE_NAME,
      payload,
    };
    this.channel.publish(env.RABBITMQ_EXCHANGE, routingKey, Buffer.from(JSON.stringify(envelope)), {
      persistent: true,
      contentType: 'application/json',
    });
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}

export const rabbitMqPublisher = new RabbitMqPublisher();
