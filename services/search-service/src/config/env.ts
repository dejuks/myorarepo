import { cleanEnv, str, port, num, bool } from 'envalid';
import * as dotenv from 'dotenv';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'staging', 'production'], default: 'development' }),
  PORT: port({ default: 4010 }),
  SERVICE_NAME: str({ default: 'search-service' }),

  DB_HOST: str(),
  DB_PORT: port({ default: 5432 }),
  DB_USERNAME: str(),
  DB_PASSWORD: str(),
  DB_DATABASE: str(),
  DB_SSL: bool({ default: false }),

  RABBITMQ_URL: str({ default: 'amqp://guest:guest@localhost:5672' }),
  RABBITMQ_EXCHANGE: str({ default: 'ora.search.events' }),
  JOURNAL_EXCHANGE: str({ default: 'ora.journal.events' }),
  EBOOK_EXCHANGE: str({ default: 'ora.ebook.events' }),
  LIBRARY_EXCHANGE: str({ default: 'ora.library.events' }),
  REPOSITORY_EXCHANGE: str({ default: 'ora.repository.events' }),
  WIKI_EXCHANGE: str({ default: 'ora.wiki.events' }),
  RESEARCHER_EXCHANGE: str({ default: 'ora.researcher.events' }),

  LOG_LEVEL: str({ default: 'info' }),
  DEFAULT_PAGE_SIZE: num({ default: 20 }),
  MAX_PAGE_SIZE: num({ default: 50 }),
});

export type Env = typeof env;
