import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  archiveArticle,
  createArticle,
  createCategory,
  createTag,
  publishArticle,
  reviewArticle,
  startArticleReview,
  submitArticleForReview,
  updateArticle,
  type CreateArticlePayload,
  type CreateCategoryPayload,
  type CreateTagPayload,
  type UpdateArticlePayload,
} from '@/api/wikiApi';
import type { ReviewDecision } from '@/types/domain';
import { queryKeys } from '@/api/queryKeys';

export function useCreateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateArticlePayload) => createArticle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki', 'articles'] });
    },
  });
}

export function useUpdateArticle(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateArticlePayload) => updateArticle(slug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki', 'articles'] });
    },
  });
}

/** Invalidates both the article detail (status changed) and every list (status affects visibility/filters everywhere). */
function useWorkflowMutation(slug: string, mutationFn: () => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wikiArticle(slug) });
      queryClient.invalidateQueries({ queryKey: ['wiki', 'articles'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.wikiReviews(slug) });
    },
  });
}

export function useSubmitArticleForReview(slug: string) {
  return useWorkflowMutation(slug, () => submitArticleForReview(slug));
}

export function useStartArticleReview(slug: string) {
  return useWorkflowMutation(slug, () => startArticleReview(slug));
}

export function useReviewArticle(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ decision, comment }: { decision: ReviewDecision; comment?: string }) => reviewArticle(slug, decision, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wikiArticle(slug) });
      queryClient.invalidateQueries({ queryKey: ['wiki', 'articles'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.wikiReviews(slug) });
    },
  });
}

export function usePublishArticle(slug: string) {
  return useWorkflowMutation(slug, () => publishArticle(slug));
}

export function useArchiveArticle(slug: string) {
  return useWorkflowMutation(slug, () => archiveArticle(slug));
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki', 'categories'] });
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTagPayload) => createTag(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki', 'tags'] });
    },
  });
}
