import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum UserStatus {
  // Profile created, awaiting the account owner to verify their email in
  // auth-service. Auto-transitions to ACTIVE once auth-service publishes
  // `auth.email_verification.completed` (after `POST /auth/verify-email`
  // succeeds) — see infrastructure/messaging/auth-event-consumer.ts.
  // Merely registering credentials is NOT enough; auth-service's login
  // rejects PENDING_VERIFICATION accounts until this happens.
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED', // temporary, admin-imposed
  DEACTIVATED = 'DEACTIVATED', // user-initiated account closure
}

/**
 * The platform-wide identity/profile record. `id` is the same UUID used as
 * `userId` everywhere else in the platform (auth-service's user_credentials,
 * journal-service's authorUserId, etc.) — user-service is the one place
 * that UUID is a true primary key. This service is the source of truth for
 * "who this person is"; auth-service is the source of truth for "how they
 * log in" (see docs/01-architecture.md §3).
 */
@Entity({ name: 'users' })
export class User {
  @PrimaryColumn('uuid')
  id!: string;

  /** Denormalized cache of the login email held by auth-service, kept in sync via UserEmailChanged-style flows; not authoritative. */
  @Index({ unique: true })
  @Column({ type: 'citext' })
  email!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 150, nullable: true })
  displayName!: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  locale!: string;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender!: Gender | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone!: string | null;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status!: UserStatus;

  @Column({ name: 'deactivated_at', type: 'timestamptz', nullable: true })
  deactivatedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
