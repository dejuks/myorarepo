import { Article, ArticleStatus } from '@domain/entities/article.entity';

export interface ListArticlesFilter {
  search?: string;
  language?: string;
  categoryId?: string;
  tagId?: string;
  authorId?: string;
  /** Explicit AND filter from the caller's query params. */
  status?: ArticleStatus;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
  /**
   * Baseline visibility as an OR-clause: `status IN (visibleStatuses) OR createdBy = viewerUserId`.
   * Omitted entirely for a moderator/admin (unrestricted access). See ArticleService.listArticles.
   */
  visibleStatuses?: ArticleStatus[];
  viewerUserId?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateArticleInput {
  title: string;
  slug: string;
  createdBy: string;
  summary?: string | null;
  language?: string;
  categoryId?: string | null;
  featuredImageUrl?: string | null;
}

export interface UpdateArticleMetadataInput {
  summary?: string | null;
  language?: string;
  categoryId?: string | null;
  featuredImageUrl?: string | null;
}

export interface IArticleRepository {
  findById(id: string): Promise<Article | null>;
  findBySlug(slug: string): Promise<Article | null>;
  /** True if any article already has this exact slug — used to resolve title -> slug collisions at creation time. */
  slugExists(slug: string): Promise<boolean>;
  create(entity: CreateArticleInput): Promise<Article>;
  /** Bumps `updatedAt` to now and applies any metadata changes — called whenever a new revision is saved. */
  touch(id: string, metadata?: UpdateArticleMetadataInput): Promise<void>;
  setStatus(id: string, status: ArticleStatus, publishedAt?: Date | null): Promise<void>;
  list(filter: ListArticlesFilter): Promise<PaginatedResult<Article>>;
  setTags(articleId: string, tagIds: string[]): Promise<void>;
  listTagIdsForArticle(articleId: string): Promise<string[]>;
}
