import { ArticleReview, ReviewDecision } from '@domain/entities/article-review.entity';

export interface CreateArticleReviewInput {
  articleId: string;
  reviewerUserId: string;
  decision: ReviewDecision;
  comment?: string | null;
}

export interface IArticleReviewRepository {
  create(input: CreateArticleReviewInput): Promise<ArticleReview>;
  listForArticle(articleId: string): Promise<ArticleReview[]>;
}
