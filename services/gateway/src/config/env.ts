import { cleanEnv, str, port, num, url, makeValidator } from 'envalid';
import * as dotenv from 'dotenv';

dotenv.config();

/** Comma-separated list of allowed browser origins, e.g. "http://localhost:3000,https://app.ora.example". */
const commaSeparatedList = makeValidator<string[]>((input) =>
  input
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'staging', 'production'], default: 'development' }),
  PORT: port({ default: 8080 }),
  SERVICE_NAME: str({ default: 'api-gateway' }),

  // The frontend (web/) runs on :3000 in local/dev/Docker by default — see web/docker-compose.yml
  // and infra/docker-compose.yml.
  CORS_ALLOWED_ORIGINS: commaSeparatedList({ default: ['http://localhost:3000', 'http://localhost:5173'] }),

  JWT_ACCESS_SECRET: str(),
  JWT_ISSUER: str({ default: 'ora-platform' }),
  JWT_AUDIENCE: str({ default: 'ora-platform-clients' }),

  AUTH_SERVICE_URL: url({ default: 'http://localhost:4001' }),
  USER_SERVICE_URL: url({ default: 'http://localhost:4002' }),
  RESEARCHER_SERVICE_URL: url({ default: 'http://localhost:4003' }),
  REPOSITORY_SERVICE_URL: url({ default: 'http://localhost:4004' }),
  JOURNAL_SERVICE_URL: url({ default: 'http://localhost:4005' }),
  EBOOK_SERVICE_URL: url({ default: 'http://localhost:4006' }),
  LIBRARY_SERVICE_URL: url({ default: 'http://localhost:4007' }),
  WIKI_SERVICE_URL: url({ default: 'http://localhost:4008' }),
  NOTIFICATION_SERVICE_URL: url({ default: 'http://localhost:4009' }),
  SEARCH_SERVICE_URL: url({ default: 'http://localhost:4010' }),
  MONITORING_SERVICE_URL: url({ default: 'http://localhost:4011' }),

  RATE_LIMIT_WINDOW_MS: num({ default: 60_000 }),
  RATE_LIMIT_MAX: num({ default: 300 }),
  AUTH_RATE_LIMIT_WINDOW_MS: num({ default: 900_000 }),
  AUTH_RATE_LIMIT_MAX: num({ default: 20 }),

  PROXY_TIMEOUT_MS: num({ default: 15_000 }),

  LOG_LEVEL: str({ default: 'info' }),
});

export type Env = typeof env;
