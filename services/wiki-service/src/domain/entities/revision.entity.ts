import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One saved version of an article's content — immutable once created (an
 * edit always INSERTs a new revision, never UPDATEs an old one). This is
 * what gives the wiki its edit history / diff-able past versions, same as
 * MediaWiki's revision table. `content` is Markdown (not MediaWiki wikitext
 * — see the platform's Phase-1 scoping decision for the wiki module).
 */
@Entity({ name: 'revisions' })
export class Revision {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'article_id', type: 'uuid' })
  articleId!: string;

  @Column({ type: 'text' })
  content!: string;

  /** Optional short note on what changed, shown in the history list — standard wiki editing convention. */
  @Column({ name: 'edit_summary', type: 'varchar', length: 500, nullable: true })
  editSummary!: string | null;

  @Column({ name: 'editor_user_id', type: 'uuid' })
  editorUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
