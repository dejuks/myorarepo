import { Revision } from '@domain/entities/revision.entity';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IRevisionRepository {
  create(entity: Pick<Revision, 'articleId' | 'content' | 'editSummary' | 'editorUserId'>): Promise<Revision>;
  findById(id: string): Promise<Revision | null>;
  /** Most recent revision for an article — i.e. "the current version of the page". Null only if the article somehow has zero revisions (shouldn't happen: creation always writes one). */
  findLatestForArticle(articleId: string): Promise<Revision | null>;
  /** Full edit history, newest first. */
  listForArticle(articleId: string, page: number, pageSize: number): Promise<PaginatedResult<Revision>>;
}
