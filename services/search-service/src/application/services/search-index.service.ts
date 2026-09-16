import { SearchDocument } from '@domain/entities/search-document.entity';
import {
  ISearchDocumentRepository,
  UpsertSearchDocumentInput,
} from '@domain/repositories/search-document.repository.interface';

/**
 * Write side of the derived index — invoked exclusively by the event
 * consumer (infrastructure/messaging/event-consumer.ts). There is
 * deliberately no REST path into this service: indexing only happens via
 * consumed *.published/*.updated/*.deleted domain events, per the
 * derived-store design in docs/01-architecture.md §3.
 */
export class SearchIndexService {
  constructor(private readonly searchDocumentRepo: ISearchDocumentRepository) {}

  async indexDocument(input: UpsertSearchDocumentInput): Promise<SearchDocument> {
    return this.searchDocumentRepo.upsert(input);
  }

  async removeDocument(entityType: string, entityId: string): Promise<boolean> {
    return this.searchDocumentRepo.deleteByEntity(entityType, entityId);
  }
}
