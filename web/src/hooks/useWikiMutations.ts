import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createArticle, updateArticle, type CreateArticlePayload, type UpdateArticlePayload } from '@/api/wikiApi';

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
