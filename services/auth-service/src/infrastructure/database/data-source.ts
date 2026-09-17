import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '@config/env';
import { UserCredential } from '@domain/entities/user-credential.entity';
import { RefreshToken } from '@domain/entities/refresh-token.entity';
import { PasswordResetToken } from '@domain/entities/password-reset-token.entity';
import { EmailVerificationToken } from '@domain/entities/email-verification-token.entity';
import { PlatformSetting } from '@domain/entities/platform-setting.entity';
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
  // EmailVerificationToken was missing from this list until now — a pre-existing bug from
  // the email-verification feature (it never surfaced because unit tests use in-memory
  // fakes, not this data source; TypeORM would have thrown EntityMetadataNotFoundError the
  // first time any real verify-email/resend call ran against Postgres).
  entities: [UserCredential, RefreshToken, PasswordResetToken, EmailVerificationToken, PlatformSetting, AuthAuditLog],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations_history',
});
