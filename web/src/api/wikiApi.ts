import { apiClient, unwrap } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { Article, ArticleWithContent, PaginatedResult, Revision } from '@/types/domain';

/**
 * Client for wiki-service's Phase 1 content endpoints (articles + their
 * revision history) — see docs/01-architecture.md's wiki module section.
 * Reads are public on the backend (no auth required), but every call here
 * still goes through `apiClient`, which harmlessly omits the Authorization
 * header when there's no access token rather than failing.
 */

export interface ListArticlesParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listArticles(params: ListArticlesParams): Promise<PaginatedResult<Article>> {
  const response = await apiClient.get<ApiEnvelope<Article[]>>('/wiki/articles', {
    params: { search: params.search || undefined, page: params.page, pageSize: params.pageSize },
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
}

export function createArticle(payload: CreateArticlePayload): Promise<ArticleWithContent> {
  return unwrap(apiClient.post<ApiEnvelope<ArticleWithContent>>('/wiki/articles', payload));
}

export interface UpdateArticlePayload {
  content: string;
  editSummary?: string;
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
