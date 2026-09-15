import { LessThan, Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { RefreshToken } from '@domain/entities/refresh-token.entity';
import { IRefreshTokenRepository } from '@domain/repositories/refresh-token.repository.interface';

export class RefreshTokenRepository implements IRefreshTokenRepository {
  private readonly repo: Repository<RefreshToken>;

  constructor() {
    this.repo = AppDataSource.getRepository(RefreshToken);
  }

  async create(entity: Partial<RefreshToken>): Promise<RefreshToken> {
    const created = this.repo.create(entity);
    return this.repo.save(created);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repo.findOneBy({ tokenHash });
  }

  async revoke(id: string, replacedByTokenId?: string): Promise<void> {
    await this.repo.update({ id }, { revokedAt: new Date(), replacedByTokenId: replacedByTokenId ?? null });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.update({ userId, revokedAt: undefined }, { revokedAt: new Date() });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.repo.delete({ expiresAt: LessThan(new Date()) });
    return result.affected ?? 0;
  }
}
