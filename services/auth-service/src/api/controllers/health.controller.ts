import { Request, Response } from 'express';
import { AppDataSource } from '@infrastructure/database/data-source';
import { redisClient } from '@infrastructure/cache/redis.client';
import { env } from '@config/env';

export class HealthController {
  /** Liveness probe: process is up and can respond. No dependency checks — kept cheap and fast. */
  liveness = (_req: Request, res: Response): void => {
    res.status(200).json({ status: 'ok', service: env.SERVICE_NAME, timestamp: new Date().toISOString() });
  };

  /** Readiness probe: verifies the service can actually serve traffic (DB + Redis reachable). */
  readiness = async (_req: Request, res: Response): Promise<void> => {
    const checks: Record<string, 'ok' | 'error'> = { database: 'error', redis: 'error' };

    try {
      await AppDataSource.query('SELECT 1');
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    try {
      await redisClient.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    const isReady = Object.values(checks).every((v) => v === 'ok');
    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not_ready',
      service: env.SERVICE_NAME,
      checks,
      timestamp: new Date().toISOString(),
    });
  };
}
