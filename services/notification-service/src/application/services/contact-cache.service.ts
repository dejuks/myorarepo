import { IUserContactCacheRepository } from '@domain/repositories/user-contact-cache.repository.interface';

/** Keeps the local user_contact_cache read-model in sync with upstream events. See domain/entities/user-contact-cache.entity.ts for why this exists. */
export class ContactCacheService {
  constructor(private readonly contactCacheRepo: IUserContactCacheRepository) {}

  async upsertFromEvent(userId: string, data: { email?: string | null; phone?: string | null }): Promise<void> {
    const changes: { email?: string | null; phone?: string | null } = {};
    if (data.email !== undefined) changes.email = data.email;
    if (data.phone !== undefined) changes.phone = data.phone;
    if (Object.keys(changes).length === 0) return;

    await this.contactCacheRepo.upsert(userId, changes);
  }
}
