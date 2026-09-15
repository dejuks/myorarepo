import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export enum UserStatus {
  PENDING = 'PENDING', // profile created, awaiting credential registration/email verification
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

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status!: UserStatus;

  @Column({ name: 'deactivated_at', type: 'timestamptz', nullable: true })
  deactivatedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
