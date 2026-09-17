import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { Article } from '@domain/entities/article.entity';
import { IArticleRepository, ListArticlesFilter, PaginatedResult } from '@domain/repositories/article.repository.interface';

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

  async create(entity: Pick<Article, 'title' | 'slug' | 'createdBy'>): Promise<Article> {
    const created = this.repo.create(entity);
    return this.repo.save(created);
  }

  async touch(id: string): Promise<void> {
    await this.repo.update({ id }, { updatedAt: new Date() });
  }

  async list(filter: ListArticlesFilter): Promise<PaginatedResult<Article>> {
    const qb = this.repo.createQueryBuilder('a');

    if (filter.search) {
      qb.andWhere('a.title ILIKE :search', { search: `%${filter.search}%` });
    }

    qb.orderBy('a.updatedAt', 'DESC')
      .skip((filter.page - 1) * filter.pageSize)
      .take(filter.pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: filter.page, pageSize: filter.pageSize };
  }
}
