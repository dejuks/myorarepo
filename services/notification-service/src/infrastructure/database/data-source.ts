import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '@config/env';
import { Notification } from '@domain/entities/notification.entity';
import { NotificationTemplate } from '@domain/entities/notification-template.entity';
import { UserContactCache } from '@domain/entities/user-contact-cache.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  entities: [Notification, NotificationTemplate, UserContactCache],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations_history',
});
