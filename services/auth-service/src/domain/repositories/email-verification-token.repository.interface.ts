import { EmailVerificationToken } from '@domain/entities/email-verification-token.entity';

export interface IEmailVerificationTokenRepository {
  create(entity: Partial<EmailVerificationToken>): Promise<EmailVerificationToken>;
  findByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null>;
  markUsed(id: string): Promise<void>;
  invalidateAllForUser(userId: string): Promise<void>;
}
