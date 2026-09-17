import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum ReviewDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_CHANGES = 'REQUEST_CHANGES',
}

/**
 * One reviewer decision on a submitted article — see spec section
 * "8. Review & Approval Workflow". Immutable, append-only (like Revision):
 * every decision made on an article stays in its history rather than being
 * overwritten. Drives ArticleService's status state machine — see its doc
 * comment for the full Draft -> ... -> Published lifecycle.
 */
@Entity({ name: 'article_reviews' })
export class ArticleReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'article_id', type: 'uuid' })
  articleId!: string;

  @Column({ name: 'reviewer_user_id', type: 'uuid' })
  reviewerUserId!: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  comment!: string | null;

  @Column({ type: 'varchar', length: 20 })
  decision!: ReviewDecision;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
