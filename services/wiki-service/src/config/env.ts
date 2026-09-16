import { cleanEnv, str, port, bool } from 'envalid';
import * as dotenv from 'dotenv';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'staging', 'production'], default: 'development' }),
  PORT: port({ default: 4008 }),
  SERVICE_NAME: str({ default: 'wiki-service' }),

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

  // Optional module-admin bootstrap seed — see infrastructure/bootstrap/module-admin.bootstrap.ts.
  // Should match the platform's SUPER_ADMIN_EMAIL (same value derives the same user id everywhere).
  // Leave unset to disable seeding entirely. Safe to leave set across restarts: idempotent.
  SUPER_ADMIN_EMAIL: str({ default: '' }),
});

export type Env = typeof env;
