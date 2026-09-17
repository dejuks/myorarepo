import { cleanEnv, str, port, num, bool } from 'envalid';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Validates all required environment variables at process boot.
 * The service refuses to start if any are missing or malformed,
 * instead of failing unpredictably at runtime.
 */
export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'staging', 'production'], default: 'development' }),
  PORT: port({ default: 4001 }),
  SERVICE_NAME: str({ default: 'auth-service' }),

  DB_HOST: str(),
  DB_PORT: port({ default: 5432 }),
  DB_USERNAME: str(),
  DB_PASSWORD: str(),
  DB_DATABASE: str(),
  DB_SSL: bool({ default: false }),

  JWT_ACCESS_SECRET: str(),
  JWT_REFRESH_SECRET: str(),
  JWT_ACCESS_EXPIRES_IN: str({ default: '15m' }),
  JWT_REFRESH_EXPIRES_IN: str({ default: '7d' }),
  JWT_ISSUER: str({ default: 'ora-platform' }),
  JWT_AUDIENCE: str({ default: 'ora-platform-clients' }),

  REDIS_HOST: str({ default: 'localhost' }),
  REDIS_PORT: port({ default: 6379 }),
  REDIS_PASSWORD: str({ default: '' }),

  RABBITMQ_URL: str({ default: 'amqp://guest:guest@localhost:5672' }),
  RABBITMQ_EXCHANGE: str({ default: 'ora.auth.events' }),

  // Used only to build the clickable link in the verification/reset emails
  // (e.g. `${FRONTEND_URL}/verify-email?token=...`) — auth-service never
  // renders HTML itself, it just hands notification-service a ready-made URL.
  FRONTEND_URL: str({ default: 'http://localhost:3000' }),

  // ONE-TIME SEED VALUE ONLY — read once, by bootstrapPlatformSettings(), to
  // populate the platform_settings.require_email_verification row the very
  // first time this service boots against a fresh database. After that
  // first boot, this env var is never consulted again: the DB row is the
  // real, live setting, and the platform super-admin can flip it at any
  // time from Admin -> Settings (PATCH /auth/settings) with no redeploy or
  // restart — see AuthService.getPlatformSettings/updatePlatformSettings
  // and web/src/pages/PlatformSettingsPage.tsx. Defaults to false here so a
  // fresh install works immediately without anyone fetching a link out of
  // notification-service's console logs; turn it on (either via this env
  // var before first boot, or via the Settings toggle afterwards) before
  // going anywhere near staging/production.
  REQUIRE_EMAIL_VERIFICATION: bool({ default: false }),

  BCRYPT_SALT_ROUNDS: num({ default: 12 }),

  LOGIN_RATE_LIMIT_WINDOW_MS: num({ default: 900000 }),
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: num({ default: 5 }),

  // Optional super-admin bootstrap seed — see infrastructure/bootstrap/super-admin.bootstrap.ts.
  // Leave both unset to disable seeding entirely. Safe to leave set across
  // restarts: the seed is idempotent and no-ops once the account exists.
  SUPER_ADMIN_EMAIL: str({ default: '' }),
  SUPER_ADMIN_PASSWORD: str({ default: '' }),

  LOG_LEVEL: str({ default: 'info' }),
});

export type Env = typeof env;
