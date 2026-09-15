import 'reflect-metadata';
import { createApp } from './app';
import { env } from '@config/env';
import { logger } from '@common/logger/logger';
import { AppDataSource } from '@infrastructure/database/data-source';
import { rabbitMqPublisher } from '@infrastructure/messaging/rabbitmq.publisher';
import { NotificationEventConsumer } from '@infrastructure/messaging/event-consumer';
import { NotificationDispatchService } from '@application/services/notification-dispatch.service';
import { ContactCacheService } from '@application/services/contact-cache.service';
import { NotificationRepository } from '@infrastructure/repositories/notification.repository';
import { NotificationTemplateRepository } from '@infrastructure/repositories/notification-template.repository';
import { UserContactCacheRepository } from '@infrastructure/repositories/user-contact-cache.repository';
import { createEmailProvider } from '@infrastructure/providers';

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  logger.info('Database connection established');

  await rabbitMqPublisher.connect();

  const dispatchService = new NotificationDispatchService(
    new NotificationRepository(),
    new NotificationTemplateRepository(),
    new UserContactCacheRepository(),
    createEmailProvider(),
  );
  const contactCacheService = new ContactCacheService(new UserContactCacheRepository());
  const eventConsumer = new NotificationEventConsumer(dispatchService, contactCacheService);
  await eventConsumer.start();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`${env.SERVICE_NAME} listening on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info('Swagger docs available at /api-docs');
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await eventConsumer.stop().catch((err) => logger.error({ err }, 'Error stopping event consumer'));
      await AppDataSource.destroy().catch((err) => logger.error({ err }, 'Error closing database connection'));
      await rabbitMqPublisher.close().catch((err) => logger.error({ err }, 'Error closing RabbitMQ publisher'));
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error({ reason }, 'Unhandled promise rejection'));
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
