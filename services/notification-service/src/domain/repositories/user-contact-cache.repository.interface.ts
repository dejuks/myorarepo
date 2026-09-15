import { UserContactCache } from '@domain/entities/user-contact-cache.entity';

export interface IUserContactCacheRepository {
  findByUserId(userId: string): Promise<UserContactCache | null>;
  upsert(userId: string, changes: Partial<UserContactCache>): Promise<UserContactCache>;
}
