import 'reflect-metadata';
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { authRouter } from '@api/routes/auth.routes';
import { healthRouter } from '@api/routes/health.routes';
import { errorHandlerMiddleware, notFoundMiddleware } from '@api/middleware/error-handler.middleware';
import { requestLoggerMiddleware } from '@api/middleware/request-logger.middleware';
import { globalRateLimiter } from '@api/middleware/rate-limiter.middleware';
import { swaggerSpec } from '@config/swagger';

/**
 * Assembles the Express application. Kept separate from server.ts so the
 * app object can be imported directly in integration tests (supertest)
 * without binding a real network port.
 */
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

  // Health endpoints are unversioned and un-prefixed, per platform convention (probed directly by the orchestrator).
  app.use('/', healthRouter);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Versioned business API, matching the gateway's /api/v1/... routing scheme.
  app.use('/api/v1', authRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
