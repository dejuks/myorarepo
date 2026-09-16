import { UpsertSearchDocumentInput } from '@domain/repositories/search-document.repository.interface';

/** One entry per upstream exchange this service consumes. Kept in one place so adding a new content service later is a one-line change here plus one entry in event-consumer.ts's EXCHANGES_TO_CONSUME. */
export const DOMAIN_BY_EXCHANGE: Record<string, { entityType: string; sourceService: string }> = {
  'ora.journal.events': { entityType: 'journal_article', sourceService: 'journal-service' },
  'ora.ebook.events': { entityType: 'ebook', sourceService: 'ebook-service' },
  'ora.library.events': { entityType: 'library_item', sourceService: 'library-service' },
  'ora.repository.events': { entityType: 'repository_item', sourceService: 'repository-service' },
  'ora.wiki.events': { entityType: 'wiki_article', sourceService: 'wiki-service' },
  'ora.researcher.events': { entityType: 'researcher_profile', sourceService: 'researcher-service' },
};

export interface RoutedEvent {
  /** The exchange the message arrived on, e.g. 'ora.journal.events'. */
  exchange: string;
  /** The message's routing key, e.g. 'article.published', 'article.deleted'. */
  routingKey: string;
  /** The raw event payload — shape is producer-defined and may evolve; assumed to loosely be `{ id, title, description?, tags?, url?, publishedAt?, ...rest }`. */
  payload: unknown;
}

export type MappedEvent =
  | { kind: 'index'; document: UpsertSearchDocumentInput }
  | { kind: 'delete'; entityType: string; entityId: string }
  | { kind: 'ignore'; reason: string };

function isDeleteRoutingKey(routingKey: string): boolean {
  return routingKey.toLowerCase().endsWith('.deleted');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Pure mapping function: (exchange, routing key, payload) -> what to do to
 * the local index. Deliberately isolated from amqplib/TypeORM so it's cheap
 * to unit test and easy to extend as each content service's real event
 * shape lands. Never throws — malformed/unrecognized input maps to
 * `{ kind: 'ignore' }` so the consumer can log and ack instead of crashing
 * or dead-lettering forever on a shape it doesn't understand yet.
 */
export function mapEventToSearchAction(event: RoutedEvent): MappedEvent {
  const domain = DOMAIN_BY_EXCHANGE[event.exchange];
  if (!domain) {
    return { kind: 'ignore', reason: `Unrecognized exchange: ${event.exchange}` };
  }

  if (!isPlainObject(event.payload)) {
    return { kind: 'ignore', reason: 'Payload is not an object' };
  }

  const payload = event.payload;
  const id = payload.id ?? payload.entityId;
  if (typeof id !== 'string' || id.length === 0) {
    return { kind: 'ignore', reason: 'Payload missing a usable id' };
  }

  const deletedFlag = payload.deleted === true || payload.isDeleted === true;
  if (isDeleteRoutingKey(event.routingKey) || deletedFlag) {
    return { kind: 'delete', entityType: domain.entityType, entityId: id };
  }

  const title = payload.title;
  if (typeof title !== 'string' || title.trim().length === 0) {
    return { kind: 'ignore', reason: 'Payload missing a usable title for indexing' };
  }

  const description = typeof payload.description === 'string' ? payload.description : null;
  const url = typeof payload.url === 'string' ? payload.url : null;
  const tags = Array.isArray(payload.tags) ? payload.tags.filter((t): t is string => typeof t === 'string') : null;

  let publishedAt: Date | null = null;
  if (typeof payload.publishedAt === 'string' || payload.publishedAt instanceof Date) {
    const parsed = new Date(payload.publishedAt as string | Date);
    if (!Number.isNaN(parsed.getTime())) publishedAt = parsed;
  }

  const knownKeys = new Set(['id', 'entityId', 'title', 'description', 'tags', 'url', 'publishedAt', 'deleted', 'isDeleted']);
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!knownKeys.has(key)) rest[key] = value;
  }

  return {
    kind: 'index',
    document: {
      entityType: domain.entityType,
      entityId: id,
      title,
      description,
      tags,
      url,
      sourceService: domain.sourceService,
      publishedAt,
      metadata: Object.keys(rest).length > 0 ? rest : null,
    },
  };
}
