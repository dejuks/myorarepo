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
const LOGIN_ATTEMPT_PREFIX = 'auth:ratelimit:login:';

/** Blacklists an access token's JWT ID (jti) until its natural expiry, used on logout / password change. */
export async function blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
  if (ttlSeconds <= 0) return;
  await redisClient.set(`${BLACKLIST_PREFIX}${jti}`, '1', 'EX', ttlSeconds);
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const result = await redisClient.get(`${BLACKLIST_PREFIX}${jti}`);
  return result !== null;
}

export async function incrementLoginAttempts(key: string, windowSeconds: number): Promise<number> {
  const redisKey = `${LOGIN_ATTEMPT_PREFIX}${key}`;
  const count = await redisClient.incr(redisKey);
  if (count === 1) {
    await redisClient.expire(redisKey, windowSeconds);
  }
  return count;
}

export async function clearLoginAttempts(key: string): Promise<void> {
  await redisClient.del(`${LOGIN_ATTEMPT_PREFIX}${key}`);
}
