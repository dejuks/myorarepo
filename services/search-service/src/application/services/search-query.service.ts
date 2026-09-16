import { SearchDocument } from '@domain/entities/search-document.entity';
import {
  ISearchDocumentRepository,
  PaginatedResult,
  SearchQueryParams,
} from '@domain/repositories/search-document.repository.interface';
import { NotFoundError } from '@common/errors/app-error';

/** Read side of the derived index — the public GET /search surface. */
export class SearchQueryService {
  constructor(private readonly searchDocumentRepo: ISearchDocumentRepository) {}

  async search(params: SearchQueryParams): Promise<PaginatedResult<SearchDocument>> {
    return this.searchDocumentRepo.search(params);
  }

  async findById(id: string): Promise<SearchDocument> {
    const doc = await this.searchDocumentRepo.findById(id);
    if (!doc) throw new NotFoundError('Search document not found');
    return doc;
  }
}
