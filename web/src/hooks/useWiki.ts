import { useQuery } from '@tanstack/react-query';
import {
  getArticle,
  getMyWikiRoles,
  getRevision,
  listArticleReviews,
  listArticles,
  listCategories,
  listRevisions,
  listTags,
  type ListArticlesParams,
} from '@/api/wikiApi';
import { queryKeys } from '@/api/queryKeys';
import { useAppSelector } from '@/app/hooks';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useIsAdmin } from '@/hooks/useIsAdmin';

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

/** GET /articles/:slug/reviews requires auth on the backend (any logged-in user) — gated on isAuthenticated here. */
export function useArticleReviews(slug: string | undefined) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.wikiReviews(slug ?? ''),
    queryFn: () => listArticleReviews(slug as string),
    enabled: Boolean(slug) && isAuthenticated,
  });
}

export function useCategories(language?: string) {
  return useQuery({
    queryKey: queryKeys.wikiCategories(language),
    queryFn: () => listCategories(language),
    staleTime: 60_000,
  });
}

export function useTags(language?: string) {
  return useQuery({
    queryKey: queryKeys.wikiTags(language),
    queryFn: () => listTags(language),
    staleTime: 60_000,
  });
}

/**
 * Whether the current account can act as a wiki moderator (ADMINISTRATOR or
 * BUREAUCRAT, live-checked against wiki_db — see getMyWikiRoles' doc
 * comment) — drives whether the review/publish/archive buttons show up on
 * an article page. The platform-wide ADMIN override is checked separately
 * from the JWT, which this self-check doesn't need since ADMIN can already
 * reach these actions regardless of any wiki_db row.
 */
export function useIsWikiModerator(): boolean {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { data: currentUser } = useCurrentUser();
  const isPlatformAdmin = useIsAdmin();
  const userId = currentUser?.id;

  const rolesQuery = useQuery({
    queryKey: queryKeys.wikiMyRoles(userId ?? ''),
    queryFn: () => getMyWikiRoles(userId as string),
    enabled: isAuthenticated && Boolean(userId) && !isPlatformAdmin,
    staleTime: 60_000,
  });

  if (isPlatformAdmin) return true;
  return Boolean(rolesQuery.data?.some((role) => role === 'ADMINISTRATOR' || role === 'BUREAUCRAT'));
}
