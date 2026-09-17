import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { ArticleReview } from '@domain/entities/article-review.entity';
import { CreateArticleReviewInput, IArticleReviewRepository } from '@domain/repositories/article-review.repository.interface';

export class ArticleReviewRepository implements IArticleReviewRepository {
  private readonly repo: Repository<ArticleReview>;

  constructor() {
    this.repo = AppDataSource.getRepository(ArticleReview);
  }

  async create(input: CreateArticleReviewInput): Promise<ArticleReview> {
    const created = this.repo.create({
      articleId: input.articleId,
      reviewerUserId: input.reviewerUserId,
      decision: input.decision,
      comment: input.comment ?? null,
    });
    return this.repo.save(created);
  }

  async listForArticle(articleId: string): Promise<ArticleReview[]> {
    return this.repo.find({ where: { articleId }, order: { createdAt: 'DESC' } });
  }
}
