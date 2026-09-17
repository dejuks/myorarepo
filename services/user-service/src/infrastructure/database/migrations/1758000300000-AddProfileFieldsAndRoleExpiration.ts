import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends the user profile with the demographic/contact fields from the
 * platform's full user-management field list that weren't already covered
 * (gender, date of birth, address, country/region/city, timezone — locale,
 * avatar, bio, phone and the rest already existed), and adds an optional
 * expiration to role assignments so a role can be granted temporarily.
 *
 * New migration file, not an edit of an earlier one — see AddPermissions'
 * doc comment for why: this project's databases already hold real data by
 * the time this was written.
 */
export class AddProfileFieldsAndRoleExpiration1758000300000 implements MigrationInterface {
  name = 'AddProfileFieldsAndRoleExpiration1758000300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE user_gender_enum AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
    `);

    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN gender         user_gender_enum,
        ADD COLUMN date_of_birth  DATE,
        ADD COLUMN address        TEXT,
        ADD COLUMN country        VARCHAR(100),
        ADD COLUMN region         VARCHAR(100),
        ADD COLUMN city           VARCHAR(100),
        ADD COLUMN timezone       VARCHAR(50);
    `);

    await queryRunner.query(`
      ALTER TABLE user_role_assignments
        ADD COLUMN expires_at TIMESTAMPTZ;
      CREATE INDEX idx_ura_expires_at ON user_role_assignments(expires_at) WHERE expires_at IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ura_expires_at;`);
    await queryRunner.query(`ALTER TABLE user_role_assignments DROP COLUMN IF EXISTS expires_at;`);
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS gender,
        DROP COLUMN IF EXISTS date_of_birth,
        DROP COLUMN IF EXISTS address,
        DROP COLUMN IF EXISTS country,
        DROP COLUMN IF EXISTS region,
        DROP COLUMN IF EXISTS city,
        DROP COLUMN IF EXISTS timezone;
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS user_gender_enum;`);
  }
}
