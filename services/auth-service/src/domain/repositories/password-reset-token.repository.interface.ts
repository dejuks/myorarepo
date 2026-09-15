import { PasswordResetToken } from '@domain/entities/password-reset-token.entity';

export interface IPasswordResetTokenRepository {
  create(entity: Partial<PasswordResetToken>): Promise<PasswordResetToken>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  markUsed(id: string): Promise<void>;
  invalidateAllForUser(userId: string): Promise<void>;
}
