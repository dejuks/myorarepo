import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { SearchDocument } from '@domain/entities/search-document.entity';
import {
  ISearchDocumentRepository,
  PaginatedResult,
  SearchQueryParams,
  UpsertSearchDocumentInput,
} from '@domain/repositories/search-document.repository.interface';

export class SearchDocumentRepository implements ISearchDocumentRepository {
  private readonly repo: Repository<SearchDocument>;

  constructor() {
    this.repo = AppDataSource.getRepository(SearchDocument);
  }

  async upsert(doc: UpsertSearchDocumentInput): Promise<SearchDocument> {
    const existing = await this.repo.findOneBy({ entityType: doc.entityType, entityId: doc.entityId });

    if (existing) {
      Object.assign(existing, {
        title: doc.title,
        description: doc.description ?? null,
        tags: doc.tags ?? null,
        url: doc.url ?? null,
        sourceService: doc.sourceService,
        publishedAt: doc.publishedAt ?? null,
        metadata: doc.metadata ?? null,
      });
      return this.repo.save(existing);
    }

    const created = this.repo.create({
      entityType: doc.entityType,
      entityId: doc.entityId,
      title: doc.title,
      description: doc.description ?? null,
      tags: doc.tags ?? null,
      url: doc.url ?? null,
      sourceService: doc.sourceService,
      publishedAt: doc.publishedAt ?? null,
      metadata: doc.metadata ?? null,
    });
    return this.repo.save(created);
  }

  async deleteByEntity(entityType: string, entityId: string): Promise<boolean> {
    const result = await this.repo.delete({ entityType, entityId });
    return (result.affected ?? 0) > 0;
  }

  async findById(id: string): Promise<SearchDocument | null> {
    return this.repo.findOneBy({ id });
  }

  async search(params: SearchQueryParams): Promise<PaginatedResult<SearchDocument>> {
    const qb = this.repo.createQueryBuilder('d');

    const hasQuery = !!params.query && params.query.trim().length > 0;

    if (hasQuery) {
      qb.andWhere(`d.search_vector @@ plainto_tsquery('english', :q)`, { q: params.query });
    }
    if (params.entityType) {
      qb.andWhere('d.entity_type = :entityType', { entityType: params.entityType });
    }
    if (params.sourceService) {
      qb.andWhere('d.source_service = :sourceService', { sourceService: params.sourceService });
    }

    if (hasQuery) {
      qb.addSelect(`ts_rank(d.search_vector, plainto_tsquery('english', :q))`, 'rank').orderBy('rank', 'DESC');
    } else {
      qb.orderBy('d.published_at', 'DESC', 'NULLS LAST').addOrderBy('d.created_at', 'DESC');
    }

    qb.skip((params.page - 1) * params.limit).take(params.limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: params.page, pageSize: params.limit };
  }
}
