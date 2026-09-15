import pino from 'pino';
import { env } from '@config/env';

/**
 * Structured JSON logger shared across the service.
 * In development, output is pretty-printed; in staging/production it is
 * plain JSON so it can be shipped to a centralized logging stack.
 */
export const logger = pino({
  name: env.SERVICE_NAME,
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
  base: { service: env.SERVICE_NAME, env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
});
