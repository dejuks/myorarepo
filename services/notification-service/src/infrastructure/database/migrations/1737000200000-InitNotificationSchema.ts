import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema for notification_db, seeded with the templates needed to
 * cover every event in application/services/event-template-map.ts so the
 * service is immediately functional against auth-service and user-service
 * events without a manual setup step.
 */
export class InitNotificationSchema1737000200000 implements MigrationInterface {
  name = 'InitNotificationSchema1737000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`CREATE TYPE notification_channel_enum AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');`);
    await queryRunner.query(`CREATE TYPE notification_status_enum AS ENUM ('PENDING', 'SENT', 'FAILED');`);

    await queryRunner.query(`
      CREATE TABLE notification_templates (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code            VARCHAR(100) NOT NULL,
        channel         notification_channel_enum NOT NULL,
        subject         VARCHAR(255),
        body_template   TEXT NOT NULL,
        is_active       BOOLEAN NOT NULL DEFAULT true,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (code, channel)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE notifications (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL,
        channel         notification_channel_enum NOT NULL,
        template_code   VARCHAR(100) NOT NULL,
        subject         VARCHAR(255),
        body            TEXT NOT NULL,
        status          notification_status_enum NOT NULL DEFAULT 'PENDING',
        metadata        JSONB,
        error_message   TEXT,
        read_at         TIMESTAMPTZ,
        sent_at         TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE user_contact_cache (
        user_id     UUID PRIMARY KEY,
        email       VARCHAR(255),
        phone       VARCHAR(30),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      INSERT INTO notification_templates (code, channel, subject, body_template) VALUES
        ('WELCOME', 'EMAIL', 'Welcome to the ORA Digital Platform', 'Hello, welcome to ORA! Your account has been created with the email {{email}}.'),
        ('WELCOME', 'IN_APP', NULL, 'Welcome to the ORA Digital Platform!'),
        ('PASSWORD_RESET_REQUESTED', 'EMAIL', 'Reset your ORA Platform password', 'We received a request to reset your password. Use this code: {{resetToken}}. It expires at {{expiresAt}}. If you did not request this, ignore this email.'),
        ('PASSWORD_RESET_COMPLETED', 'EMAIL', 'Your ORA Platform password was changed', 'Your password was just reset. If this was not you, contact support immediately.'),
        ('PASSWORD_RESET_COMPLETED', 'IN_APP', NULL, 'Your password was successfully reset.'),
        ('PASSWORD_CHANGED', 'EMAIL', 'Your ORA Platform password was changed', 'Your account password was just changed. If this was not you, contact support immediately.'),
        ('PASSWORD_CHANGED', 'IN_APP', NULL, 'Your password was changed.'),
        ('PROFILE_CREATED', 'IN_APP', NULL, 'Your profile has been created. Complete it to get the most out of ORA.'),
        ('ROLE_ASSIGNED', 'IN_APP', NULL, 'You were granted the {{role}} role.'),
        ('ACCOUNT_STATUS_CHANGED', 'EMAIL', 'Your ORA Platform account status changed', 'Your account status is now {{status}}.'),
        ('ACCOUNT_STATUS_CHANGED', 'IN_APP', NULL, 'Your account status is now {{status}}.');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_contact_cache;`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications;`);
    await queryRunner.query(`DROP TABLE IF EXISTS notification_templates;`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_channel_enum;`);
  }
}
