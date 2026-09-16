import { SearchQueryService } from '@application/services/search-query.service';
import { FakeSearchDocumentRepository } from './fakes';

describe('SearchQueryService', () => {
  let repo: FakeSearchDocumentRepository;
  let service: SearchQueryService;

  beforeEach(async () => {
    repo = new FakeSearchDocumentRepository();
    service = new SearchQueryService(repo);

    await repo.upsert({ entityType: 'journal_article', entityId: 'j-1', title: 'Malaria research in Ethiopia', sourceService: 'journal-service', publishedAt: new Date('2026-01-01') });
    await repo.upsert({ entityType: 'ebook', entityId: 'e-1', title: 'Introduction to Oromo Grammar', sourceService: 'ebook-service', publishedAt: new Date('2026-02-01') });
    await repo.upsert({ entityType: 'wiki_article', entityId: 'w-1', title: 'Oromia Region', description: 'A wiki article about malaria prevention', sourceService: 'wiki-service', publishedAt: new Date('2026-03-01') });
  });

  it('returns all documents, newest publishedAt first, when no query is given', async () => {
    const result = await service.search({ page: 1, limit: 20 });
    expect(result.total).toBe(3);
    expect(result.items[0].entityId).toBe('w-1');
    expect(result.items[2].entityId).toBe('j-1');
  });

  it('filters by free-text query against title or description', async () => {
    const result = await service.search({ query: 'malaria', page: 1, limit: 20 });
    expect(result.total).toBe(2);
    expect(result.items.map((r) => r.entityId).sort()).toEqual(['j-1', 'w-1']);
  });

  it('filters by entityType', async () => {
    const result = await service.search({ entityType: 'ebook', page: 1, limit: 20 });
    expect(result.total).toBe(1);
    expect(result.items[0].entityId).toBe('e-1');
  });

  it('filters by sourceService', async () => {
    const result = await service.search({ sourceService: 'wiki-service', page: 1, limit: 20 });
    expect(result.total).toBe(1);
    expect(result.items[0].entityId).toBe('w-1');
  });

  it('applies pagination math correctly (page 2 of 2 with limit 2)', async () => {
    const page1 = await service.search({ page: 1, limit: 2 });
    const page2 = await service.search({ page: 2, limit: 2 });

    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(1);
    expect(page1.total).toBe(3);
    expect(page2.total).toBe(3);
  });

  it('returns an empty paginated result (not an error) for a query that matches nothing', async () => {
    const result = await service.search({ query: 'nonexistent-topic-zzz', page: 1, limit: 20 });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('findById returns the document when it exists', async () => {
    const created = await repo.upsert({ entityType: 'researcher_profile', entityId: 'rp-1', title: 'Dr. Abebe', sourceService: 'researcher-service' });
    const found = await service.findById(created.id);
    expect(found.entityId).toBe('rp-1');
  });

  it('findById throws NotFoundError for a nonexistent id', async () => {
    await expect(service.findById('nonexistent-id')).rejects.toMatchObject({ statusCode: 404 });
  });
});
