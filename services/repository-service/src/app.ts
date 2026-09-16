import 'reflect-metadata';
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { roleRouter } from '@api/routes/role.routes';
import { memberRoleRouter } from '@api/routes/member-role.routes';
import { healthRouter } from '@api/routes/health.routes';
import { errorHandlerMiddleware, notFoundMiddleware } from '@api/middleware/error-handler.middleware';
import { requestLoggerMiddleware } from '@api/middleware/request-logger.middleware';
import { globalRateLimiter } from '@api/middleware/rate-limiter.middleware';
import { swaggerSpec } from '@config/swagger';

export function createApp(): Application {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLoggerMiddleware);
  app.use(globalRateLimiter);

  app.use('/', healthRouter);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use('/api/v1', roleRouter);
  app.use('/api/v1', memberRoleRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
