import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { UserCredential } from '@domain/entities/user-credential.entity';
import { IUserCredentialRepository } from '@domain/repositories/user-credential.repository.interface';

/**
 * TypeORM-backed implementation of IUserCredentialRepository.
 * This is the only class in the service allowed to talk to the
 * user_credentials table directly.
 */
export class UserCredentialRepository implements IUserCredentialRepository {
  private readonly repo: Repository<UserCredential>;

  constructor() {
    this.repo = AppDataSource.getRepository(UserCredential);
  }

  async findById(id: string): Promise<UserCredential | null> {
    return this.repo.findOneBy({ id });
  }

  async findByUserId(userId: string): Promise<UserCredential | null> {
    return this.repo.findOneBy({ userId });
  }

  async findByEmail(email: string): Promise<UserCredential | null> {
    return this.repo.findOneBy({ email: email.toLowerCase() });
  }

  /** Explicitly selects the normally-hidden mfaSecret column, used only during login/MFA verification. */
  async findByEmailWithSecret(email: string): Promise<UserCredential | null> {
    return this.repo
      .createQueryBuilder('uc')
      .addSelect('uc.mfaSecret')
      .where('uc.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async create(entity: Partial<UserCredential>): Promise<UserCredential> {
    const created = this.repo.create(entity);
    return this.repo.save(created);
  }

  async update(id: string, changes: Partial<UserCredential>): Promise<UserCredential> {
    await this.repo.update({ id }, changes);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`UserCredential ${id} not found after update`);
    return updated;
  }

  async incrementFailedLoginAttempts(id: string): Promise<number> {
    await this.repo.increment({ id }, 'failedLoginAttempts', 1);
    const row = await this.findById(id);
    return row?.failedLoginAttempts ?? 0;
  }

  async resetFailedLoginAttempts(id: string): Promise<void> {
    await this.repo.update({ id }, { failedLoginAttempts: 0, lockedUntil: null });
  }

  async lockAccount(id: string, until: Date): Promise<void> {
    await this.repo.update({ id }, { lockedUntil: until });
  }
}
