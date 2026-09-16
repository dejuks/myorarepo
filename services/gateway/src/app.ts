import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { healthRouter } from '@api/routes/health.routes';
import { createProxyRouter } from '@proxy/proxy-router';
import { authVerifyMiddleware } from '@middleware/auth-verify.middleware';
import { errorHandlerMiddleware, notFoundMiddleware } from '@middleware/error-handler.middleware';
import { requestLoggerMiddleware } from '@middleware/request-logger.middleware';
import { globalRateLimiter, authRateLimiter } from '@middleware/rate-limiter.middleware';
import { env } from '@config/env';

/**
 * The gateway's own TLS termination is handled by Nginx in front of this
 * process in every real deployment (see docs/01-architecture.md §2/§12) —
 * this Express app is the routing/policy layer behind it.
 */
export function createApp(): Application {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind Nginx
  app.use(helmet());
  app.use(
    cors({
      // The web frontend (web/, served on :3000 in dev/Docker) calls the gateway directly
      // from the browser using an Authorization header, not cookies, so credentials aren't
      // required — but the default `cors()` origin reflection is tightened here to an
      // explicit allowlist rather than left wide open. Add other frontend origins as needed.
      origin: env.CORS_ALLOWED_ORIGINS,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(compression());
  app.use(requestLoggerMiddleware);

  // Health endpoints bypass rate limiting and auth entirely — probed constantly by the orchestrator.
  app.use('/', healthRouter);

  app.use(globalRateLimiter);
  app.use('/api/v1/auth', authRateLimiter);

  app.use(authVerifyMiddleware);
  app.use(createProxyRouter());

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
