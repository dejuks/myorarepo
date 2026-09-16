import { cleanEnv, str, port, num, bool } from 'envalid';
import * as dotenv from 'dotenv';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'staging', 'production'], default: 'development' }),
  PORT: port({ default: 4002 }),
  SERVICE_NAME: str({ default: 'user-service' }),

  DB_HOST: str(),
  DB_PORT: port({ default: 5432 }),
  DB_USERNAME: str(),
  DB_PASSWORD: str(),
  DB_DATABASE: str(),
  DB_SSL: bool({ default: false }),

  JWT_ACCESS_SECRET: str(),
  JWT_ISSUER: str({ default: 'ora-platform' }),
  JWT_AUDIENCE: str({ default: 'ora-platform-clients' }),

  REDIS_HOST: str({ default: 'localhost' }),
  REDIS_PORT: port({ default: 6379 }),
  REDIS_PASSWORD: str({ default: '' }),

  RABBITMQ_URL: str({ default: 'amqp://guest:guest@localhost:5672' }),
  RABBITMQ_EXCHANGE: str({ default: 'ora.user.events' }),

  LOG_LEVEL: str({ default: 'info' }),

  DEFAULT_PAGE_SIZE: num({ default: 20 }),
  MAX_PAGE_SIZE: num({ default: 100 }),

  // Optional super-admin bootstrap seed — see infrastructure/bootstrap/super-admin.bootstrap.ts.
  // Must match auth-service's SUPER_ADMIN_EMAIL exactly (same value derives the same user id).
  // Leave unset to disable seeding entirely. Safe to leave set across restarts: idempotent.
  SUPER_ADMIN_EMAIL: str({ default: '' }),
  SUPER_ADMIN_FIRST_NAME: str({ default: 'Super' }),
  SUPER_ADMIN_LAST_NAME: str({ default: 'Admin' }),
});

export type Env = typeof env;
