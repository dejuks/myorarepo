import 'reflect-metadata';
import { createApp } from './app';
import { env } from '@config/env';
import { logger } from '@common/logger/logger';
import { AppDataSource } from '@infrastructure/database/data-source';
import { rabbitMqPublisher } from '@infrastructure/messaging/rabbitmq.publisher';
import { redisClient } from '@infrastructure/cache/redis.client';
import { UserCredentialRepository } from '@infrastructure/repositories/user-credential.repository';
import { bootstrapSuperAdmin } from '@infrastructure/bootstrap/super-admin.bootstrap';

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  logger.info('Database connection established');

  await bootstrapSuperAdmin(new UserCredentialRepository(), {
    email: env.SUPER_ADMIN_EMAIL,
    password: env.SUPER_ADMIN_PASSWORD,
  });

  await rabbitMqPublisher.connect();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`${env.SERVICE_NAME} listening on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`Swagger docs available at /api-docs`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await AppDataSource.destroy().catch((err) => logger.error({ err }, 'Error closing database connection'));
      await rabbitMqPublisher.close().catch((err) => logger.error({ err }, 'Error closing RabbitMQ connection'));
      redisClient.disconnect();
      process.exit(0);
    });
    // Force-exit if graceful shutdown hangs.
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
