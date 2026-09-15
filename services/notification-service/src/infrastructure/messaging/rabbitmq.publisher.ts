import amqplib, { Channel, ChannelModel } from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { env } from '@config/env';
import { logger } from '@common/logger/logger';

class RabbitMqPublisher {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  async connect(sharedConnection?: ChannelModel): Promise<void> {
    try {
      this.connection = sharedConnection ?? (await amqplib.connect(env.RABBITMQ_URL));
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(env.RABBITMQ_EXCHANGE, 'topic', { durable: true });
      logger.info({ exchange: env.RABBITMQ_EXCHANGE }, 'Notification publisher connected to RabbitMQ');
    } catch (err) {
      logger.error({ err }, 'Failed to connect notification publisher to RabbitMQ');
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
  }
}

export const rabbitMqPublisher = new RabbitMqPublisher();
