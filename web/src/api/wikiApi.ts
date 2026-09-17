import { apiClient, unwrap } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type {
  Article,
  ArticleReview,
  ArticleStatus,
  ArticleWithContent,
  Category,
  PaginatedResult,
  ReviewDecision,
  Revision,
  Tag,
} from '@/types/domain';

/**
 * Client for wiki-service's content endpoints — articles + revision
 * history (Phase 1), plus categories, tags, and the review/approval
 * workflow (Phase 2). See docs/01-architecture.md's wiki module section.
 * Reads are public on the backend (no auth required), but every call here
 * still goes through `apiClient`, which harmlessly omits the Authorization
 * header when there's no access token rather than failing — and attaches
 * it when there IS one, which is what lets a logged-in author see their
 * own unpublished drafts in these same "public" endpoints.
 */

export interface ListArticlesParams {
  search?: string;
  language?: string;
  categoryId?: string;
  tagId?: string;
  authorId?: string;
  status?: ArticleStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function listArticles(params: ListArticlesParams): Promise<PaginatedResult<Article>> {
  const response = await apiClient.get<ApiEnvelope<Article[]>>('/wiki/articles', {
    params: {
      search: params.search || undefined,
      language: params.language || undefined,
      categoryId: params.categoryId || undefined,
      tagId: params.tagId || undefined,
      authorId: params.authorId || undefined,
      status: params.status || undefined,
      from: params.from || undefined,
      to: params.to || undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
  });
  const data = response.data;
  if (!data.success) throw { message: data.error.message, code: data.error.code };
  return {
    items: data.data,
    total: data.meta?.total ?? data.data.length,
    page: data.meta?.page ?? params.page ?? 1,
    pageSize: data.meta?.pageSize ?? params.pageSize ?? 20,
  };
}

export function getArticle(slug: string): Promise<ArticleWithContent> {
  return unwrap(apiClient.get<ApiEnvelope<ArticleWithContent>>(`/wiki/articles/${slug}`));
}

export interface CreateArticlePayload {
  title: string;
  content: string;
  editSummary?: string;
  summary?: string;
  language?: string;
  categoryId?: string;
  tagNames?: string[];
  featuredImageUrl?: string;
}

export function createArticle(payload: CreateArticlePayload): Promise<ArticleWithContent> {
  return unwrap(apiClient.post<ApiEnvelope<ArticleWithContent>>('/wiki/articles', payload));
}

export interface UpdateArticlePayload {
  content: string;
  editSummary?: string;
  summary?: string;
  language?: string;
  categoryId?: string;
  tagNames?: string[];
  featuredImageUrl?: string;
}

export function updateArticle(slug: string, payload: UpdateArticlePayload): Promise<ArticleWithContent> {
  return unwrap(apiClient.put<ApiEnvelope<ArticleWithContent>>(`/wiki/articles/${slug}`, payload));
}

export async function listRevisions(slug: string, page = 1, pageSize = 20): Promise<PaginatedResult<Revision>> {
  const response = await apiClient.get<ApiEnvelope<Revision[]>>(`/wiki/articles/${slug}/revisions`, {
    params: { page, pageSize },
  });
  const data = response.data;
  if (!data.success) throw { message: data.error.message, code: data.error.code };
  return {
    items: data.data,
    total: data.meta?.total ?? data.data.length,
    page: data.meta?.page ?? page,
    pageSize: data.meta?.pageSize ?? pageSize,
  };
}

export function getRevision(slug: string, revisionId: string): Promise<Revision> {
  return unwrap(apiClient.get<ApiEnvelope<Revision>>(`/wiki/articles/${slug}/revisions/${revisionId}`));
}

// ---- Review & Approval Workflow (spec section 8) ---------------------------

export function submitArticleForReview(slug: string): Promise<ArticleWithContent> {
  return unwrap(apiClient.post<ApiEnvelope<ArticleWithContent>>(`/wiki/articles/${slug}/submit`));
}

/** Moderator-only (ADMINISTRATOR/BUREAUCRAT or platform ADMIN) — moves SUBMITTED -> UNDER_REVIEW. */
export function startArticleReview(slug: string): Promise<ArticleWithContent> {
  return unwrap(apiClient.post<ApiEnvelope<ArticleWithContent>>(`/wiki/articles/${slug}/review/start`));
}

/** Moderator-only — records a decision and moves the article to APPROVED / REJECTED / DRAFT. */
export function reviewArticle(slug: string, decision: ReviewDecision, comment?: string): Promise<ArticleWithContent> {
  return unwrap(apiClient.post<ApiEnvelope<ArticleWithContent>>(`/wiki/articles/${slug}/review`, { decision, comment }));
}

/** Moderator-only — APPROVED -> PUBLISHED. */
export function publishArticle(slug: string): Promise<ArticleWithContent> {
  return unwrap(apiClient.post<ApiEnvelope<ArticleWithContent>>(`/wiki/articles/${slug}/publish`));
}

/** Moderator-only — PUBLISHED -> ARCHIVED. */
export function archiveArticle(slug: string): Promise<ArticleWithContent> {
  return unwrap(apiClient.post<ApiEnvelope<ArticleWithContent>>(`/wiki/articles/${slug}/archive`));
}

export function listArticleReviews(slug: string): Promise<ArticleReview[]> {
  return unwrap(apiClient.get<ApiEnvelope<ArticleReview[]>>(`/wiki/articles/${slug}/reviews`));
}

// ---- Categories (spec section 4) -------------------------------------------

export function listCategories(language?: string): Promise<Category[]> {
  return unwrap(apiClient.get<ApiEnvelope<Category[]>>('/wiki/categories', { params: { language: language || undefined } }));
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  parentCategoryId?: string;
  language?: string;
}

export function createCategory(payload: CreateCategoryPayload): Promise<Category> {
  return unwrap(apiClient.post<ApiEnvelope<Category>>('/wiki/categories', payload));
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/wiki/categories/${id}`);
}

// ---- Tags (spec section 5) --------------------------------------------------

export function listTags(language?: string): Promise<Tag[]> {
  return unwrap(apiClient.get<ApiEnvelope<Tag[]>>('/wiki/tags', { params: { language: language || undefined } }));
}

export interface CreateTagPayload {
  name: string;
  description?: string;
  language?: string;
}

export function createTag(payload: CreateTagPayload): Promise<Tag> {
  return unwrap(apiClient.post<ApiEnvelope<Tag>>('/wiki/tags', payload));
}

export async function deleteTag(id: string): Promise<void> {
  await apiClient.delete(`/wiki/tags/${id}`);
}

// ---- "Am I a wiki moderator?" ------------------------------------------------

/**
 * Self-check against this module's own role assignment — same live-DB
 * pattern `useMyManagedModules()` already uses for the sidebar's "Module
 * roles" link, reused here so a real (non-platform-ADMIN) ADMINISTRATOR or
 * BUREAUCRAT sees the review/publish/archive actions on an article page.
 * Always allowed for the caller's own userId (`requireSelfOrRoles` on the
 * backend), so this never 403s for a logged-in user checking themselves.
 */
export function getMyWikiRoles(userId: string): Promise<string[]> {
  return unwrap(apiClient.get<ApiEnvelope<string[]>>(`/wiki/members/${userId}/roles`));
}
