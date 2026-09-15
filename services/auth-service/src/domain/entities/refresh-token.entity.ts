import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A single issued refresh token (hashed, never stored in plaintext).
 * Rotation-on-use: redeeming a refresh token revokes it and issues a new
 * one, so a stolen-and-reused old token is detectable (`replacedByTokenId`
 * chain) and the whole family can be revoked.
 */
@Entity({ name: 'refresh_tokens' })
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /** SHA-256 hash of the actual refresh token JWT; the raw token is never persisted. */
  @Index({ unique: true })
  @Column({ name: 'token_hash', type: 'varchar' })
  tokenHash!: string;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'replaced_by_token_id', type: 'uuid', nullable: true })
  replacedByTokenId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
