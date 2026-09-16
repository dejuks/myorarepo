import 'reflect-metadata';
import { createApp } from './app';
import { env } from '@config/env';
import { logger } from '@common/logger/logger';
import { AppDataSource } from '@infrastructure/database/data-source';
import { SearchEventConsumer } from '@infrastructure/messaging/event-consumer';
import { SearchIndexService } from '@application/services/search-index.service';
import { SearchDocumentRepository } from '@infrastructure/repositories/search-document.repository';

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  logger.info('Database connection established');

  const indexService = new SearchIndexService(new SearchDocumentRepository());
  const eventConsumer = new SearchEventConsumer(indexService);
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
