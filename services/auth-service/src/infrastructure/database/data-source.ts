import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '@config/env';
import { UserCredential } from '@domain/entities/user-credential.entity';
import { RefreshToken } from '@domain/entities/refresh-token.entity';
import { PasswordResetToken } from '@domain/entities/password-reset-token.entity';
import { AuthAuditLog } from '@domain/entities/auth-audit-log.entity';

/**
 * TypeORM data source for auth_db — owned exclusively by auth-service.
 * No other service is ever granted credentials to this database.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  synchronize: false, // migrations only — never auto-sync in any environment
  logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  entities: [UserCredential, RefreshToken, PasswordResetToken, AuthAuditLog],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations_history',
});
