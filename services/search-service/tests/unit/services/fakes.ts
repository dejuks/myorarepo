import { v4 as uuidv4 } from 'uuid';
import { SearchDocument } from '@domain/entities/search-document.entity';
import {
  ISearchDocumentRepository,
  PaginatedResult,
  SearchQueryParams,
  UpsertSearchDocumentInput,
} from '@domain/repositories/search-document.repository.interface';

export class FakeSearchDocumentRepository implements ISearchDocumentRepository {
  public rows = new Map<string, SearchDocument>();

  private findExisting(entityType: string, entityId: string): SearchDocument | undefined {
    return [...this.rows.values()].find((r) => r.entityType === entityType && r.entityId === entityId);
  }

  async upsert(doc: UpsertSearchDocumentInput): Promise<SearchDocument> {
    const existing = this.findExisting(doc.entityType, doc.entityId);
    if (existing) {
      existing.title = doc.title;
      existing.description = doc.description ?? null;
      existing.tags = doc.tags ?? null;
      existing.url = doc.url ?? null;
      existing.sourceService = doc.sourceService;
      existing.publishedAt = doc.publishedAt ?? null;
      existing.metadata = doc.metadata ?? null;
      existing.updatedAt = new Date();
      return existing;
    }

    const row: SearchDocument = {
      id: uuidv4(),
      entityType: doc.entityType,
      entityId: doc.entityId,
      title: doc.title,
      description: doc.description ?? null,
      tags: doc.tags ?? null,
      url: doc.url ?? null,
      sourceService: doc.sourceService,
      publishedAt: doc.publishedAt ?? null,
      metadata: doc.metadata ?? null,
      searchVector: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rows.set(row.id, row);
    return row;
  }

  async deleteByEntity(entityType: string, entityId: string): Promise<boolean> {
    const existing = this.findExisting(entityType, entityId);
    if (!existing) return false;
    this.rows.delete(existing.id);
    return true;
  }

  async findById(id: string): Promise<SearchDocument | null> {
    return this.rows.get(id) ?? null;
  }

  async search(params: SearchQueryParams): Promise<PaginatedResult<SearchDocument>> {
    let items = [...this.rows.values()];

    if (params.query && params.query.trim().length > 0) {
      const q = params.query.toLowerCase();
      items = items.filter(
        (r) => r.title.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q),
      );
    }
    if (params.entityType) items = items.filter((r) => r.entityType === params.entityType);
    if (params.sourceService) items = items.filter((r) => r.sourceService === params.sourceService);

    items = items.sort((a, b) => {
      const at = a.publishedAt?.getTime() ?? 0;
      const bt = b.publishedAt?.getTime() ?? 0;
      return bt - at;
    });

    const total = items.length;
    const start = (params.page - 1) * params.limit;
    return { items: items.slice(start, start + params.limit), total, page: params.page, pageSize: params.limit };
  }
}
