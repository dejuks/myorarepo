import { cleanEnv, str, port, num, bool } from 'envalid';
import * as dotenv from 'dotenv';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'staging', 'production'], default: 'development' }),
  PORT: port({ default: 4004 }),
  SERVICE_NAME: str({ default: 'repository-service' }),

  DB_HOST: str(),
  DB_PORT: port({ default: 5432 }),
  DB_USERNAME: str(),
  DB_PASSWORD: str(),
  DB_DATABASE: str(),
  DB_SSL: bool({ default: false }),

  JWT_ACCESS_SECRET: str(),
  JWT_ISSUER: str({ default: 'ora-platform' }),
  JWT_AUDIENCE: str({ default: 'ora-platform-clients' }),

  LOG_LEVEL: str({ default: 'info' }),

  // Optional bootstrap seed — see infrastructure/bootstrap/module-admin.bootstrap.ts.
  // Must match the platform-wide SUPER_ADMIN_EMAIL exactly (same value derives the same user id).
  // Leave unset to disable seeding entirely. Safe to leave set across restarts: idempotent.
  SUPER_ADMIN_EMAIL: str({ default: '' }),
});

export type Env = typeof env;
