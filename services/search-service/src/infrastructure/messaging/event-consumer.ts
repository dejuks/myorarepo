import amqplib, { ChannelModel, ConsumeMessage } from 'amqplib';
import { env } from '@config/env';
import { logger } from '@common/logger/logger';
import { SearchIndexService } from '@application/services/search-index.service';
import { mapEventToSearchAction } from '@application/services/event-mapper';

interface EventEnvelope {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  producer: string;
  payload: Record<string, unknown>;
}

const EXCHANGES_TO_CONSUME = [
  { exchange: env.JOURNAL_EXCHANGE, queueSuffix: 'journal' },
  { exchange: env.EBOOK_EXCHANGE, queueSuffix: 'ebook' },
  { exchange: env.LIBRARY_EXCHANGE, queueSuffix: 'library' },
  { exchange: env.REPOSITORY_EXCHANGE, queueSuffix: 'repository' },
  { exchange: env.WIKI_EXCHANGE, queueSuffix: 'wiki' },
  { exchange: env.RESEARCHER_EXCHANGE, queueSuffix: 'researcher' },
];

/**
 * Subscribes to every content service's topic exchange and keeps the local
 * search index in sync — search-service is a pure derived store (see
 * docs/01-architecture.md §3), so this consumer is the ONLY way documents
 * ever enter or leave `search_documents`.
 *
 * Each exchange gets its own durable queue, bound with '#' (all routing
 * keys), exactly like notification-service's event-consumer.ts. None of
 * journal/ebook/library/repository/wiki/researcher-service exist yet —
 * `assertExchange`/`assertQueue`/`bindQueue` are idempotent and don't
 * require the producer to be running, so this wiring is inert today and
 * starts indexing automatically the moment each service is built and
 * publishes its first event, with zero changes here.
 */
export class SearchEventConsumer {
  private connection: ChannelModel | null = null;

  constructor(private readonly indexService: SearchIndexService) {}

  async start(): Promise<void> {
    try {
      this.connection = await amqplib.connect(env.RABBITMQ_URL);
      this.connection.on('error', (err) => logger.error({ err }, 'RabbitMQ consumer connection error'));
      this.connection.on('close', () => logger.warn('RabbitMQ consumer connection closed'));

      for (const { exchange, queueSuffix } of EXCHANGES_TO_CONSUME) {
        await this.bindAndConsume(exchange, `${env.SERVICE_NAME}.${queueSuffix}.q`);
      }

      logger.info('Search event consumer subscribed to all upstream content-domain exchanges');
    } catch (err) {
      logger.error({ err }, 'Failed to start search event consumer — the index will not stay in sync with content services');
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

    await channel.consume(queueName, (msg) => this.handleMessage(channel, exchange, msg), { noAck: false });
    logger.info({ exchange, queueName }, 'Bound and consuming');
  }

  private async handleMessage(channel: amqplib.Channel, exchange: string, msg: ConsumeMessage | null): Promise<void> {
    if (!msg) return;

    try {
      const envelope = JSON.parse(msg.content.toString()) as EventEnvelope;
      const action = mapEventToSearchAction({ exchange, routingKey: msg.fields.routingKey, payload: envelope.payload });

      switch (action.kind) {
        case 'index':
          await this.indexService.indexDocument(action.document);
          break;
        case 'delete':
          await this.indexService.removeDocument(action.entityType, action.entityId);
          break;
        case 'ignore':
          logger.warn({ exchange, routingKey: msg.fields.routingKey, reason: action.reason }, 'Ignoring unrecognized/malformed event');
          break;
      }

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
