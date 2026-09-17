import { Article } from '@domain/entities/article.entity';

export interface ListArticlesFilter {
  search?: string;
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IArticleRepository {
  findById(id: string): Promise<Article | null>;
  findBySlug(slug: string): Promise<Article | null>;
  /** True if any article already has this exact slug — used to resolve title -> slug collisions at creation time. */
  slugExists(slug: string): Promise<boolean>;
  create(entity: Pick<Article, 'title' | 'slug' | 'createdBy'>): Promise<Article>;
  /** Bumps `updatedAt` to now — called whenever a new revision is saved, so the list can sort by "recently edited". */
  touch(id: string): Promise<void>;
  list(filter: ListArticlesFilter): Promise<PaginatedResult<Article>>;
}
