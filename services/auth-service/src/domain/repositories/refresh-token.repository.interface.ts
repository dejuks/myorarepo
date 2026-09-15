import { RefreshToken } from '@domain/entities/refresh-token.entity';

export interface IRefreshTokenRepository {
  create(entity: Partial<RefreshToken>): Promise<RefreshToken>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  revoke(id: string, replacedByTokenId?: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
