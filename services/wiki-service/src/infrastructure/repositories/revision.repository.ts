import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { Revision } from '@domain/entities/revision.entity';
import { IRevisionRepository, PaginatedResult } from '@domain/repositories/revision.repository.interface';

export class RevisionRepository implements IRevisionRepository {
  private readonly repo: Repository<Revision>;

  constructor() {
    this.repo = AppDataSource.getRepository(Revision);
  }

  async create(entity: Pick<Revision, 'articleId' | 'content' | 'editSummary' | 'editorUserId'>): Promise<Revision> {
    const created = this.repo.create(entity);
    return this.repo.save(created);
  }

  async findById(id: string): Promise<Revision | null> {
    return this.repo.findOneBy({ id });
  }

  async findLatestForArticle(articleId: string): Promise<Revision | null> {
    return this.repo.findOne({ where: { articleId }, order: { createdAt: 'DESC' } });
  }

  async listForArticle(articleId: string, page: number, pageSize: number): Promise<PaginatedResult<Revision>> {
    const [items, total] = await this.repo.findAndCount({
      where: { articleId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }
}
