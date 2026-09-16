import { SearchDocument } from '@domain/entities/search-document.entity';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UpsertSearchDocumentInput {
  entityType: string;
  entityId: string;
  title: string;
  description?: string | null;
  tags?: string[] | null;
  url?: string | null;
  sourceService: string;
  publishedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
}

export interface SearchQueryParams {
  query?: string;
  entityType?: string;
  sourceService?: string;
  page: number;
  limit: number;
}

export interface ISearchDocumentRepository {
  /** Upserts by the (entityType, entityId) natural key — finds an existing row and updates it, or inserts a new one. */
  upsert(doc: UpsertSearchDocumentInput): Promise<SearchDocument>;
  deleteByEntity(entityType: string, entityId: string): Promise<boolean>;
  findById(id: string): Promise<SearchDocument | null>;
  search(params: SearchQueryParams): Promise<PaginatedResult<SearchDocument>>;
}
