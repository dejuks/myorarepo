import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { EmailVerificationToken } from '@domain/entities/email-verification-token.entity';
import { IEmailVerificationTokenRepository } from '@domain/repositories/email-verification-token.repository.interface';

export class EmailVerificationTokenRepository implements IEmailVerificationTokenRepository {
  private readonly repo: Repository<EmailVerificationToken>;

  constructor() {
    this.repo = AppDataSource.getRepository(EmailVerificationToken);
  }

  async create(entity: Partial<EmailVerificationToken>): Promise<EmailVerificationToken> {
    const created = this.repo.create(entity);
    return this.repo.save(created);
  }

  async findByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null> {
    return this.repo.findOneBy({ tokenHash });
  }

  async markUsed(id: string): Promise<void> {
    await this.repo.update({ id }, { usedAt: new Date() });
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await this.repo.update({ userId, usedAt: undefined }, { usedAt: new Date() });
  }
}
