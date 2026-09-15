import { UserCredential } from '@domain/entities/user-credential.entity';

/**
 * Port (interface) for persistence of UserCredential aggregates.
 * The application/service layer depends only on this abstraction;
 * the concrete implementation lives in infrastructure/repositories.
 */
export interface IUserCredentialRepository {
  findById(id: string): Promise<UserCredential | null>;
  findByUserId(userId: string): Promise<UserCredential | null>;
  findByEmail(email: string): Promise<UserCredential | null>;
  findByEmailWithSecret(email: string): Promise<UserCredential | null>;
  create(entity: Partial<UserCredential>): Promise<UserCredential>;
  update(id: string, changes: Partial<UserCredential>): Promise<UserCredential>;
  incrementFailedLoginAttempts(id: string): Promise<number>;
  resetFailedLoginAttempts(id: string): Promise<void>;
  lockAccount(id: string, until: Date): Promise<void>;
}
