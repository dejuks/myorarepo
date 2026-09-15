import { Request, Response } from 'express';
import { env } from '@config/env';
import { serviceRoutes } from '@config/service-registry';

export class HealthController {
  liveness = (_req: Request, res: Response): void => {
    res.status(200).json({ status: 'ok', service: env.SERVICE_NAME, timestamp: new Date().toISOString() });
  };

  /**
   * Aggregates the liveness of every implemented downstream service by
   * hitting each one's own /health endpoint. Not implemented services are
   * reported as "not_deployed" rather than "error" so this stays a useful
   * platform status view as services come online one by one.
   */
  readiness = async (_req: Request, res: Response): Promise<void> => {
    const checks: Record<string, string> = {};

    await Promise.all(
      serviceRoutes
        .filter((r, idx, arr) => arr.findIndex((x) => x.serviceName === r.serviceName) === idx) // de-dupe (user-service has 2 prefixes)
        .map(async (route) => {
          if (!route.implemented) {
            checks[route.serviceName] = 'not_deployed';
            return;
          }
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            const response = await fetch(`${route.target}/health`, { signal: controller.signal });
            clearTimeout(timeout);
            checks[route.serviceName] = response.ok ? 'ok' : 'error';
          } catch {
            checks[route.serviceName] = 'unreachable';
          }
        }),
    );

    const isReady = Object.values(checks).every((v) => v === 'ok' || v === 'not_deployed');
    res.status(isReady ? 200 : 503).json({ status: isReady ? 'ready' : 'degraded', service: env.SERVICE_NAME, checks, timestamp: new Date().toISOString() });
  };
}
