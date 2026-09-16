import { SearchIndexService } from '@application/services/search-index.service';
import { FakeSearchDocumentRepository } from './fakes';

describe('SearchIndexService', () => {
  let repo: FakeSearchDocumentRepository;
  let service: SearchIndexService;

  beforeEach(() => {
    repo = new FakeSearchDocumentRepository();
    service = new SearchIndexService(repo);
  });

  it('creates a new search document on first index for an (entityType, entityId) pair', async () => {
    const doc = await service.indexDocument({
      entityType: 'journal_article',
      entityId: 'a-1',
      title: 'A New Study',
      sourceService: 'journal-service',
    });

    expect(doc.id).toBeDefined();
    expect(repo.rows.size).toBe(1);
    expect(doc.title).toBe('A New Study');
  });

  it('updates the existing row (same id) when indexed again by the same (entityType, entityId)', async () => {
    const first = await service.indexDocument({
      entityType: 'journal_article',
      entityId: 'a-1',
      title: 'Draft Title',
      sourceService: 'journal-service',
    });

    const second = await service.indexDocument({
      entityType: 'journal_article',
      entityId: 'a-1',
      title: 'Final Title',
      sourceService: 'journal-service',
    });

    expect(repo.rows.size).toBe(1);
    expect(second.id).toBe(first.id);
    expect(second.title).toBe('Final Title');
  });

  it('treats different entityTypes with the same entityId as distinct documents', async () => {
    await service.indexDocument({ entityType: 'journal_article', entityId: 'x-1', title: 'Journal X', sourceService: 'journal-service' });
    await service.indexDocument({ entityType: 'ebook', entityId: 'x-1', title: 'Ebook X', sourceService: 'ebook-service' });

    expect(repo.rows.size).toBe(2);
  });

  it('removeDocument deletes the matching row and reports whether one existed', async () => {
    await service.indexDocument({ entityType: 'wiki_article', entityId: 'w-1', title: 'Oromia', sourceService: 'wiki-service' });

    const removed = await service.removeDocument('wiki_article', 'w-1');
    expect(removed).toBe(true);
    expect(repo.rows.size).toBe(0);

    const removedAgain = await service.removeDocument('wiki_article', 'w-1');
    expect(removedAgain).toBe(false);
  });

  it('stores optional fields (description, tags, url, publishedAt, metadata) when provided', async () => {
    const publishedAt = new Date('2026-01-01T00:00:00Z');
    const doc = await service.indexDocument({
      entityType: 'repository_item',
      entityId: 'r-1',
      title: 'Thesis on Water Systems',
      description: 'An analysis of rural water systems.',
      tags: ['water', 'engineering'],
      url: '/repository/r-1',
      sourceService: 'repository-service',
      publishedAt,
      metadata: { department: 'civil-engineering' },
    });

    expect(doc.description).toBe('An analysis of rural water systems.');
    expect(doc.tags).toEqual(['water', 'engineering']);
    expect(doc.url).toBe('/repository/r-1');
    expect(doc.publishedAt).toEqual(publishedAt);
    expect(doc.metadata).toEqual({ department: 'civil-engineering' });
  });
});
