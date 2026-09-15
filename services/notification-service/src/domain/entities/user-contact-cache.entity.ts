import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * A small local read-model, NOT the source of truth — mirrors the "Search
 * is a derived store" pattern from docs/01-architecture.md §3, applied
 * here so notification-service can resolve a userId to an email/phone
 * without a synchronous call back to user-service on every dispatch.
 * Populated by consuming `auth.registered` / `user.registered` /
 * `user.profile_updated` events. Safe to truncate and rebuild by replaying
 * those events from the start of the exchange's retention.
 */
@Entity({ name: 'user_contact_cache' })
export class UserContactCache {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
