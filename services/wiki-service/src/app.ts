import 'reflect-metadata';
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { roleRouter } from '@api/routes/role.routes';
import { memberRoleRouter } from '@api/routes/member-role.routes';
import { articleRouter } from '@api/routes/article.routes';
import { healthRouter } from '@api/routes/health.routes';
import { errorHandlerMiddleware, notFoundMiddleware } from '@api/middleware/error-handler.middleware';
import { requestLoggerMiddleware } from '@api/middleware/request-logger.middleware';
import { globalRateLimiter } from '@api/middleware/rate-limiter.middleware';
import { swaggerSpec } from '@config/swagger';

/** Gateway path prefix — the gateway forwards the full path unchanged, so every route mounted here must live under it. */
const API_PREFIX = '/api/v1/wiki';

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

  app.use(API_PREFIX, roleRouter);
  app.use(API_PREFIX, memberRoleRouter);
  app.use(API_PREFIX, articleRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
