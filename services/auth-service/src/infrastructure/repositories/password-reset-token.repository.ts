import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { PasswordResetToken } from '@domain/entities/password-reset-token.entity';
import { IPasswordResetTokenRepository } from '@domain/repositories/password-reset-token.repository.interface';

export class PasswordResetTokenRepository implements IPasswordResetTokenRepository {
  private readonly repo: Repository<PasswordResetToken>;

  constructor() {
    this.repo = AppDataSource.getRepository(PasswordResetToken);
  }

  async create(entity: Partial<PasswordResetToken>): Promise<PasswordResetToken> {
    const created = this.repo.create(entity);
    return this.repo.save(created);
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.repo.findOneBy({ tokenHash });
  }

  async markUsed(id: string): Promise<void> {
    await this.repo.update({ id }, { usedAt: new Date() });
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await this.repo.update({ userId, usedAt: undefined }, { usedAt: new Date() });
  }
}
