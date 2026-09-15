import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { UserContactCache } from '@domain/entities/user-contact-cache.entity';
import { IUserContactCacheRepository } from '@domain/repositories/user-contact-cache.repository.interface';

export class UserContactCacheRepository implements IUserContactCacheRepository {
  private readonly repo: Repository<UserContactCache>;

  constructor() {
    this.repo = AppDataSource.getRepository(UserContactCache);
  }

  async findByUserId(userId: string): Promise<UserContactCache | null> {
    return this.repo.findOneBy({ userId });
  }

  async upsert(userId: string, changes: Partial<UserContactCache>): Promise<UserContactCache> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      await this.repo.update({ userId }, changes);
      return (await this.findByUserId(userId))!;
    }
    const created = this.repo.create({ userId, ...changes });
    return this.repo.save(created);
  }
}
