import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * A wiki page's metadata — title/slug/authorship. The actual article TEXT
 * never lives here: it lives only on `Revision` rows (see revision.entity.ts),
 * and "the current article" is simply its most recent revision. That keeps
 * every edit a genuine, permanent version in history (real-Wikipedia
 * behavior) without a denormalized "latest content" column to keep in sync.
 */
@Entity({ name: 'articles' })
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 300 })
  title!: string;

  /** URL-safe, unique, derived from `title` at creation time — see slugify.util.ts. Immutable in Phase 1 (no page-move yet). */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 320 })
  slug!: string;

  /** The editor who created the article (i.e. authored its first revision). */
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  /** Bumped every time a new revision is saved — lets the article list sort by "recently edited". */
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
