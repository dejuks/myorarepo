import { useQuery } from '@tanstack/react-query';
import { getArticle, getRevision, listArticles, listRevisions, type ListArticlesParams } from '@/api/wikiApi';
import { queryKeys } from '@/api/queryKeys';

export function useArticles(params: ListArticlesParams) {
  return useQuery({
    queryKey: queryKeys.wikiArticles(params),
    queryFn: () => listArticles(params),
    placeholderData: (prev) => prev,
  });
}

export function useArticle(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.wikiArticle(slug ?? ''),
    queryFn: () => getArticle(slug as string),
    enabled: Boolean(slug),
  });
}

export function useArticleRevisions(slug: string | undefined, page = 1) {
  return useQuery({
    queryKey: queryKeys.wikiRevisions(slug ?? '', page),
    queryFn: () => listRevisions(slug as string, page),
    enabled: Boolean(slug),
  });
}

export function useRevision(slug: string | undefined, revisionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.wikiRevision(slug ?? '', revisionId ?? ''),
    queryFn: () => getRevision(slug as string, revisionId as string),
    enabled: Boolean(slug && revisionId),
  });
}
