import Redis from 'ioredis';
import { env } from '@config/env';
import { logger } from '@common/logger/logger';

export const redisClient = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redisClient.on('error', (err) => logger.error({ err }, 'Redis connection error'));
redisClient.on('connect', () => logger.info('Connected to Redis'));

const BLACKLIST_PREFIX = 'auth:blacklist:';

/** Reads the same blacklist auth-service writes to, so a revoked access token is rejected here too. */
export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const result = await redisClient.get(`${BLACKLIST_PREFIX}${jti}`);
  return result !== null;
}
