import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { Article, ArticleStatus } from '@domain/entities/article.entity';
import {
  CreateArticleInput,
  IArticleRepository,
  ListArticlesFilter,
  PaginatedResult,
  UpdateArticleMetadataInput,
} from '@domain/repositories/article.repository.interface';

export class ArticleRepository implements IArticleRepository {
  private readonly repo: Repository<Article>;

  constructor() {
    this.repo = AppDataSource.getRepository(Article);
  }

  async findById(id: string): Promise<Article | null> {
    return this.repo.findOneBy({ id });
  }

  async findBySlug(slug: string): Promise<Article | null> {
    return this.repo.findOneBy({ slug });
  }

  async slugExists(slug: string): Promise<boolean> {
    const count = await this.repo.countBy({ slug });
    return count > 0;
  }

  async create(entity: CreateArticleInput): Promise<Article> {
    const created = this.repo.create({
      title: entity.title,
      slug: entity.slug,
      createdBy: entity.createdBy,
      summary: entity.summary ?? null,
      language: entity.language ?? 'om',
      categoryId: entity.categoryId ?? null,
      featuredImageUrl: entity.featuredImageUrl ?? null,
    });
    return this.repo.save(created);
  }

  async touch(id: string, metadata?: UpdateArticleMetadataInput): Promise<void> {
    await this.repo.update({ id }, { updatedAt: new Date(), ...metadata });
  }

  async setStatus(id: string, status: ArticleStatus, publishedAt?: Date | null): Promise<void> {
    await this.repo.update({ id }, publishedAt === undefined ? { status } : { status, publishedAt });
  }

  async list(filter: ListArticlesFilter): Promise<PaginatedResult<Article>> {
    const qb = this.repo.createQueryBuilder('a');

    if (filter.search) {
      // Postgres full-text search over title + summary — see Article.searchVector's doc comment.
      qb.andWhere("a.searchVector @@ plainto_tsquery('simple', :search)", { search: filter.search });
    }
    if (filter.language) {
      qb.andWhere('a.language = :language', { language: filter.language });
    }
    if (filter.categoryId) {
      qb.andWhere('a.categoryId = :categoryId', { categoryId: filter.categoryId });
    }
    if (filter.authorId) {
      qb.andWhere('a.createdBy = :authorId', { authorId: filter.authorId });
    }
    if (filter.tagId) {
      qb.innerJoin('article_tags', 'at', 'at.article_id = a.id AND at.tag_id = :tagId', { tagId: filter.tagId });
    }
    if (filter.from) {
      qb.andWhere('a.createdAt >= :from', { from: filter.from });
    }
    if (filter.to) {
      qb.andWhere('a.createdAt <= :to', { to: filter.to });
    }

    if (filter.visibleStatuses?.length) {
      if (filter.viewerUserId) {
        qb.andWhere('(a.status IN (:...visibleStatuses) OR a.createdBy = :viewer)', {
          visibleStatuses: filter.visibleStatuses,
          viewer: filter.viewerUserId,
        });
      } else {
        qb.andWhere('a.status IN (:...visibleStatuses)', { visibleStatuses: filter.visibleStatuses });
      }
    }
    // Explicit status filter narrows whatever visibility already allows (see ListArticlesFilter's doc comment).
    if (filter.status) {
      qb.andWhere('a.status = :status', { status: filter.status });
    }

    qb.orderBy('a.updatedAt', 'DESC')
      .skip((filter.page - 1) * filter.pageSize)
      .take(filter.pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: filter.page, pageSize: filter.pageSize };
  }

  async setTags(articleId: string, tagIds: string[]): Promise<void> {
    await AppDataSource.transaction(async (manager) => {
      await manager.query('DELETE FROM article_tags WHERE article_id = $1', [articleId]);
      for (const tagId of tagIds) {
        await manager.query('INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [articleId, tagId]);
      }
    });
  }

  async listTagIdsForArticle(articleId: string): Promise<string[]> {
    const rows = await AppDataSource.query<Array<{ tag_id: string }>>('SELECT tag_id FROM article_tags WHERE article_id = $1', [articleId]);
    return rows.map((r) => r.tag_id);
  }
}
