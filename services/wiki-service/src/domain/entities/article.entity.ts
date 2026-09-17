import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * An article's lifecycle state — see spec section "8. Review & Approval
 * Workflow". Allowed transitions (enforced in ArticleService, not the
 * database):
 *   DRAFT -> SUBMITTED                (author submits for review)
 *   SUBMITTED -> UNDER_REVIEW         (a reviewer picks it up)
 *   UNDER_REVIEW -> APPROVED          (reviewer decision: APPROVE)
 *   UNDER_REVIEW -> REJECTED          (reviewer decision: REJECT)
 *   UNDER_REVIEW -> DRAFT             (reviewer decision: REQUEST_CHANGES)
 *   APPROVED -> PUBLISHED             (a reviewer publishes it)
 *   PUBLISHED -> ARCHIVED             (a reviewer archives it)
 * Public (unauthenticated) reads only ever see PUBLISHED articles; the
 * author always sees their own regardless of status — see
 * ArticleService.listArticles / getArticleBySlug.
 */
export enum ArticleStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  REJECTED = 'REJECTED',
}

/**
 * A wiki page's metadata — title/slug/authorship plus the Phase 2 fields
 * from spec section "2. Article Management" (summary, language, category,
 * featured image, status/workflow). The actual article TEXT never lives
 * here: it lives only on `Revision` rows (see revision.entity.ts), and "the
 * current article" is simply its most recent revision. That keeps every
 * edit a genuine, permanent version in history (real-Wikipedia behavior)
 * without a denormalized "latest content" column to keep in sync. Tags are
 * a many-to-many via the `article_tags` join table, managed directly by
 * ArticleRepository rather than a TypeORM relation (see its doc comment).
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

  /** Short standalone blurb (distinct from the revisioned `content`) — shown in listings/search results. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  summary!: string | null;

  /** ISO 639-1-ish code, e.g. 'om' (Afaan Oromo), 'en'. See Category's doc comment on why this predates the full Language entity. */
  @Index()
  @Column({ type: 'varchar', length: 10, default: 'om' })
  language!: string;

  @Index()
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId!: string | null;

  @Column({ name: 'featured_image_url', type: 'varchar', length: 1000, nullable: true })
  featuredImageUrl!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 20, default: ArticleStatus.DRAFT })
  status!: ArticleStatus;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  /** The editor who created the article (i.e. authored its first revision). */
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  /** Bumped every time a new revision is saved — lets the article list sort by "recently edited". */
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  /**
   * Postgres full-text index over title + summary (see the migration's
   * GENERATED ALWAYS AS ... STORED column) — backs spec section "11. Search
   * Module"'s full-text search entirely inside wiki_db, no other service
   * involved. Declared here (rather than referenced by raw column name in
   * the repository) so TypeORM's query builder maps `a.searchVector` to the
   * real column correctly; never selected, inserted, or updated by the app
   * since Postgres maintains it.
   */
  @Column({ name: 'search_vector', type: 'tsvector', select: false, insert: false, update: false })
  searchVector!: unknown;
}
