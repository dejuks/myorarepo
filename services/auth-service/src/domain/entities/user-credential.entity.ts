import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum AccountStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
  DISABLED = 'DISABLED',
}

/**
 * UserCredential is the authentication service's own record for a login
 * identity. It intentionally does NOT hold profile data (name, bio, avatar,
 * etc.) — that lives in user-service's user_db and is linked only by
 * `userId`, a UUID shared across services. This keeps credential data
 * (the most sensitive data in the platform) isolated in its own database
 * with its own, tighter access controls.
 */
@Entity({ name: 'user_credentials' })
export class UserCredential {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Shared platform-wide user identifier, also used as the primary key in user-service's user_db. */
  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Index({ unique: true })
  @Column({ type: 'citext' })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar' })
  passwordHash!: string;

  @Column({ type: 'varchar', array: true, default: () => "'{}'" })
  roles!: string[];

  @Column({ name: 'account_status', type: 'enum', enum: AccountStatus, default: AccountStatus.PENDING_VERIFICATION })
  accountStatus!: AccountStatus;

  @Column({ name: 'mfa_enabled', type: 'boolean', default: false })
  mfaEnabled!: boolean;

  @Column({ name: 'mfa_secret', type: 'varchar', nullable: true, select: false })
  mfaSecret!: string | null;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil!: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
