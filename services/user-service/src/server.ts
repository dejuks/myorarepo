import 'reflect-metadata';
import { createApp } from './app';
import { env } from '@config/env';
import { logger } from '@common/logger/logger';
import { AppDataSource } from '@infrastructure/database/data-source';
import { rabbitMqPublisher } from '@infrastructure/messaging/rabbitmq.publisher';
import { AuthEventConsumer } from '@infrastructure/messaging/auth-event-consumer';
import { redisClient } from '@infrastructure/cache/redis.client';
import { UserRepository } from '@infrastructure/repositories/user.repository';
import { RoleRepository } from '@infrastructure/repositories/role.repository';
import { UserRoleAssignmentRepository } from '@infrastructure/repositories/user-role-assignment.repository';
import { bootstrapSuperAdmin } from '@infrastructure/bootstrap/super-admin.bootstrap';
import { UserService } from '@application/services/user.service';

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  logger.info('Database connection established');

  await bootstrapSuperAdmin(new UserRepository(), new RoleRepository(), new UserRoleAssignmentRepository(), {
    email: env.SUPER_ADMIN_EMAIL,
    firstName: env.SUPER_ADMIN_FIRST_NAME,
    lastName: env.SUPER_ADMIN_LAST_NAME,
  });

  await rabbitMqPublisher.connect();

  const userService = new UserService(new UserRepository(), new RoleRepository(), new UserRoleAssignmentRepository());
  const authEventConsumer = new AuthEventConsumer(userService);
  await authEventConsumer.start();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`${env.SERVICE_NAME} listening on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info('Swagger docs available at /api-docs');
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await authEventConsumer.stop().catch((err) => logger.error({ err }, 'Error closing auth event consumer'));
      await AppDataSource.destroy().catch((err) => logger.error({ err }, 'Error closing database connection'));
      await rabbitMqPublisher.close().catch((err) => logger.error({ err }, 'Error closing RabbitMQ connection'));
      redisClient.disconnect();
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
