import { cleanEnv, str, port, num, bool } from 'envalid';
import * as dotenv from 'dotenv';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'staging', 'production'], default: 'development' }),
  PORT: port({ default: 4009 }),
  SERVICE_NAME: str({ default: 'notification-service' }),

  DB_HOST: str(),
  DB_PORT: port({ default: 5432 }),
  DB_USERNAME: str(),
  DB_PASSWORD: str(),
  DB_DATABASE: str(),
  DB_SSL: bool({ default: false }),

  JWT_ACCESS_SECRET: str(),
  JWT_ISSUER: str({ default: 'ora-platform' }),
  JWT_AUDIENCE: str({ default: 'ora-platform-clients' }),

  RABBITMQ_URL: str({ default: 'amqp://guest:guest@localhost:5672' }),
  RABBITMQ_EXCHANGE: str({ default: 'ora.notification.events' }),
  AUTH_EXCHANGE: str({ default: 'ora.auth.events' }),
  USER_EXCHANGE: str({ default: 'ora.user.events' }),

  EMAIL_PROVIDER: str({ choices: ['console', 'smtp'], default: 'console' }),
  SMTP_HOST: str({ default: '' }),
  SMTP_PORT: port({ default: 587 }),
  SMTP_USER: str({ default: '' }),
  SMTP_PASSWORD: str({ default: '' }),
  SMTP_FROM: str({ default: 'no-reply@ora-platform.org' }),

  LOG_LEVEL: str({ default: 'info' }),
  DEFAULT_PAGE_SIZE: num({ default: 20 }),
  MAX_PAGE_SIZE: num({ default: 100 }),
});

export type Env = typeof env;
