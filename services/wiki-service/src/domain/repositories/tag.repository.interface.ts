import { Tag } from '@domain/entities/tag.entity';

export interface ITagRepository {
  list(language?: string): Promise<Tag[]>;
  findById(id: string): Promise<Tag | null>;
  findByIds(ids: string[]): Promise<Tag[]>;
  findByName(name: string, language: string): Promise<Tag | null>;
  create(name: string, language: string, description?: string | null): Promise<Tag>;
  /** Finds each name (case-insensitive, per language), creating any that don't exist yet — same "any editor can tag freely" philosophy as article creation. */
  findOrCreateMany(names: string[], language: string): Promise<Tag[]>;
  delete(id: string): Promise<void>;
}
