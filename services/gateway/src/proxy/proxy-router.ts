import { Router, Request, Response, NextFunction } from 'express';
import proxy from 'express-http-proxy';
import { env } from '@config/env';
import { serviceRoutes } from '@config/service-registry';
import { ServiceUnavailableError } from '@common/errors/app-error';
import { logger } from '@common/logger/logger';

/**
 * Registers one express-http-proxy handler per entry in the service
 * registry. Routing/versioning/request-shaping lives entirely here — no
 * business logic. `implemented: false` services short-circuit with a 503
 * instead of a dangling proxy to a host that doesn't exist yet, so the
 * routing table can be complete on day one and filled in service by
 * service (see docs/01-architecture.md §14, the build order).
 */
export function createProxyRouter(): Router {
  const router = Router();

  for (const route of serviceRoutes) {
    if (!route.implemented) {
      router.use(route.pathPrefix, (_req: Request, _res: Response, next: NextFunction) => {
        next(new ServiceUnavailableError(`${route.serviceName} is not yet deployed`));
      });
      continue;
    }

    router.use(
      route.pathPrefix,
      proxy(route.target, {
        timeout: env.PROXY_TIMEOUT_MS,
        proxyReqPathResolver: (req) => req.originalUrl,
        proxyErrorHandler: (err, res, next) => {
          logger.error({ err, service: route.serviceName, target: route.target }, 'Proxy error reaching downstream service');
          next(new ServiceUnavailableError(`${route.serviceName} is temporarily unavailable`));
        },
        userResDecorator: (_proxyRes, proxyResData) => proxyResData,
      }),
    );
  }

  return router;
}
