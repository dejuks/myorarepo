import { mapEventToSearchAction } from '@application/services/event-mapper';

describe('mapEventToSearchAction', () => {
  it('maps a .published event on ora.journal.events into an index action with the right entityType/sourceService', () => {
    const action = mapEventToSearchAction({
      exchange: 'ora.journal.events',
      routingKey: 'article.published',
      payload: { id: 'j-1', title: 'A New Study', description: 'Abstract text', tags: ['health'], url: '/journals/j-1', publishedAt: '2026-01-01T00:00:00Z' },
    });

    expect(action.kind).toBe('index');
    if (action.kind === 'index') {
      expect(action.document.entityType).toBe('journal_article');
      expect(action.document.sourceService).toBe('journal-service');
      expect(action.document.entityId).toBe('j-1');
      expect(action.document.title).toBe('A New Study');
      expect(action.document.description).toBe('Abstract text');
      expect(action.document.tags).toEqual(['health']);
      expect(action.document.publishedAt).toEqual(new Date('2026-01-01T00:00:00Z'));
    }
  });

  it('maps an .updated event the same way as .published (also an index action)', () => {
    const action = mapEventToSearchAction({
      exchange: 'ora.ebook.events',
      routingKey: 'book.updated',
      payload: { id: 'e-1', title: 'Updated Ebook Title' },
    });

    expect(action.kind).toBe('index');
    if (action.kind === 'index') {
      expect(action.document.entityType).toBe('ebook');
      expect(action.document.sourceService).toBe('ebook-service');
    }
  });

  it('maps a .deleted routing key into a delete action', () => {
    const action = mapEventToSearchAction({
      exchange: 'ora.wiki.events',
      routingKey: 'article.deleted',
      payload: { id: 'w-1' },
    });

    expect(action).toEqual({ kind: 'delete', entityType: 'wiki_article', entityId: 'w-1' });
  });

  it('maps a payload with an explicit deleted flag into a delete action even without a .deleted routing key', () => {
    const action = mapEventToSearchAction({
      exchange: 'ora.repository.events',
      routingKey: 'item.status-changed',
      payload: { id: 'r-1', deleted: true },
    });

    expect(action).toEqual({ kind: 'delete', entityType: 'repository_item', entityId: 'r-1' });
  });

  it('folds unrecognized fields into metadata without throwing', () => {
    const action = mapEventToSearchAction({
      exchange: 'ora.researcher.events',
      routingKey: 'profile.published',
      payload: { id: 'rp-1', title: 'Dr. Abebe', institution: 'Addis Ababa University', hIndex: 12 },
    });

    expect(action.kind).toBe('index');
    if (action.kind === 'index') {
      expect(action.document.metadata).toEqual({ institution: 'Addis Ababa University', hIndex: 12 });
    }
  });

  it('ignores events from an unrecognized exchange rather than throwing', () => {
    const action = mapEventToSearchAction({
      exchange: 'ora.unknown.events',
      routingKey: 'thing.published',
      payload: { id: '1', title: 'x' },
    });

    expect(action.kind).toBe('ignore');
  });

  it('ignores a non-object payload rather than throwing', () => {
    const action = mapEventToSearchAction({
      exchange: 'ora.journal.events',
      routingKey: 'article.published',
      payload: 'not-an-object',
    });

    expect(action.kind).toBe('ignore');
  });

  it('ignores a payload missing an id rather than throwing', () => {
    const action = mapEventToSearchAction({
      exchange: 'ora.journal.events',
      routingKey: 'article.published',
      payload: { title: 'No id here' },
    });

    expect(action.kind).toBe('ignore');
  });

  it('ignores a payload missing a usable title for a non-delete event rather than throwing', () => {
    const action = mapEventToSearchAction({
      exchange: 'ora.journal.events',
      routingKey: 'article.published',
      payload: { id: 'j-2' },
    });

    expect(action.kind).toBe('ignore');
  });

  it('does not require a title for a delete action', () => {
    const action = mapEventToSearchAction({
      exchange: 'ora.library.events',
      routingKey: 'item.deleted',
      payload: { id: 'l-1' },
    });

    expect(action).toEqual({ kind: 'delete', entityType: 'library_item', entityId: 'l-1' });
  });

  it('accepts entityId as an alternative key to id', () => {
    const action = mapEventToSearchAction({
      exchange: 'ora.wiki.events',
      routingKey: 'article.published',
      payload: { entityId: 'w-2', title: 'Another Wiki Article' },
    });

    expect(action.kind).toBe('index');
    if (action.kind === 'index') expect(action.document.entityId).toBe('w-2');
  });

  it('ignores an unparseable publishedAt instead of throwing, leaving it null', () => {
    const action = mapEventToSearchAction({
      exchange: 'ora.journal.events',
      routingKey: 'article.published',
      payload: { id: 'j-3', title: 'Valid Title', publishedAt: 'not-a-real-date' },
    });

    expect(action.kind).toBe('index');
    if (action.kind === 'index') expect(action.document.publishedAt).toBeNull();
  });
});
