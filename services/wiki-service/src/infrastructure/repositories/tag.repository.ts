import { In, Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { Tag } from '@domain/entities/tag.entity';
import { ITagRepository } from '@domain/repositories/tag.repository.interface';

export class TagRepository implements ITagRepository {
  private readonly repo: Repository<Tag>;

  constructor() {
    this.repo = AppDataSource.getRepository(Tag);
  }

  async list(language?: string): Promise<Tag[]> {
    return this.repo.find({
      where: language ? { language } : {},
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Tag | null> {
    return this.repo.findOneBy({ id });
  }

  async findByIds(ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) return [];
    return this.repo.findBy({ id: In(ids) });
  }

  async findByName(name: string, language: string): Promise<Tag | null> {
    return this.repo
      .createQueryBuilder('t')
      .where('LOWER(t.name) = LOWER(:name)', { name })
      .andWhere('t.language = :language', { language })
      .getOne();
  }

  async create(name: string, language: string, description: string | null = null): Promise<Tag> {
    const created = this.repo.create({ name, language, description });
    return this.repo.save(created);
  }

  async findOrCreateMany(names: string[], language: string): Promise<Tag[]> {
    // Dedupe case-insensitively (findByName below resolves case-insensitively too), keeping
    // each name's first-seen casing for any tag that turns out to be brand new.
    const seen = new Map<string, string>();
    for (const raw of names) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) seen.set(key, trimmed);
    }

    const tags: Tag[] = [];
    for (const name of seen.values()) {
      const existing = await this.findByName(name, language);
      tags.push(existing ?? (await this.create(name, language)));
    }
    return tags;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
