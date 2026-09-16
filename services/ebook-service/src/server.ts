import 'reflect-metadata';
import { createApp } from './app';
import { env } from '@config/env';
import { logger } from '@common/logger/logger';
import { AppDataSource } from '@infrastructure/database/data-source';
import { bootstrapModuleAdmin } from '@infrastructure/bootstrap/module-admin.bootstrap';
import { RoleRepository } from '@infrastructure/repositories/role.repository';
import { UserRoleAssignmentRepository } from '@infrastructure/repositories/user-role-assignment.repository';

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  logger.info('Database connection established');

  await bootstrapModuleAdmin(new RoleRepository(), new UserRoleAssignmentRepository(), { email: env.SUPER_ADMIN_EMAIL || undefined });

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`${env.SERVICE_NAME} listening on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info('Swagger docs available at /api-docs');
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
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
