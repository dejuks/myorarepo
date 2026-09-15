import { v4 as uuidv4 } from 'uuid';
import { UserCredential, AccountStatus } from '@domain/entities/user-credential.entity';
import { RefreshToken } from '@domain/entities/refresh-token.entity';
import { PasswordResetToken } from '@domain/entities/password-reset-token.entity';
import { IUserCredentialRepository } from '@domain/repositories/user-credential.repository.interface';
import { IRefreshTokenRepository } from '@domain/repositories/refresh-token.repository.interface';
import { IPasswordResetTokenRepository } from '@domain/repositories/password-reset-token.repository.interface';
import { IAuthAuditLogRepository } from '@domain/repositories/auth-audit-log.repository.interface';

/**
 * In-memory fakes for every repository interface, used to unit-test
 * AuthService in complete isolation from PostgreSQL — this is the payoff
 * of the Repository Pattern: the service layer is testable with zero
 * database, zero mocking framework boilerplate.
 */
export class FakeUserCredentialRepository implements IUserCredentialRepository {
  public rows = new Map<string, UserCredential>();

  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findByUserId(userId: string) {
    return [...this.rows.values()].find((r) => r.userId === userId) ?? null;
  }
  async findByEmail(email: string) {
    return [...this.rows.values()].find((r) => r.email === email.toLowerCase()) ?? null;
  }
  async findByEmailWithSecret(email: string) {
    return this.findByEmail(email);
  }
  async create(entity: Partial<UserCredential>) {
    const row: UserCredential = {
      id: uuidv4(),
      userId: entity.userId ?? uuidv4(),
      email: (entity.email ?? '').toLowerCase(),
      passwordHash: entity.passwordHash ?? '',
      roles: entity.roles ?? ['USER'],
      accountStatus: entity.accountStatus ?? AccountStatus.PENDING_VERIFICATION,
      mfaEnabled: entity.mfaEnabled ?? false,
      mfaSecret: entity.mfaSecret ?? null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      emailVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rows.set(row.id, row);
    return row;
  }
  async update(id: string, changes: Partial<UserCredential>) {
    const row = this.rows.get(id);
    if (!row) throw new Error('not found');
    Object.assign(row, changes, { updatedAt: new Date() });
    return row;
  }
  async incrementFailedLoginAttempts(id: string) {
    const row = this.rows.get(id);
    if (!row) return 0;
    row.failedLoginAttempts += 1;
    return row.failedLoginAttempts;
  }
  async resetFailedLoginAttempts(id: string) {
    const row = this.rows.get(id);
    if (row) {
      row.failedLoginAttempts = 0;
      row.lockedUntil = null;
    }
  }
  async lockAccount(id: string, until: Date) {
    const row = this.rows.get(id);
    if (row) row.lockedUntil = until;
  }
}

export class FakeRefreshTokenRepository implements IRefreshTokenRepository {
  public rows = new Map<string, RefreshToken>();

  async create(entity: Partial<RefreshToken>) {
    const row: RefreshToken = {
      id: uuidv4(),
      userId: entity.userId ?? '',
      tokenHash: entity.tokenHash ?? '',
      userAgent: entity.userAgent ?? null,
      ipAddress: entity.ipAddress ?? null,
      expiresAt: entity.expiresAt ?? new Date(Date.now() + 60_000),
      revokedAt: null,
      replacedByTokenId: null,
      createdAt: new Date(),
    };
    this.rows.set(row.id, row);
    return row;
  }
  async findByTokenHash(tokenHash: string) {
    return [...this.rows.values()].find((r) => r.tokenHash === tokenHash) ?? null;
  }
  async revoke(id: string, replacedByTokenId?: string) {
    const row = this.rows.get(id);
    if (row) {
      row.revokedAt = new Date();
      row.replacedByTokenId = replacedByTokenId ?? null;
    }
  }
  async revokeAllForUser(userId: string) {
    for (const row of this.rows.values()) {
      if (row.userId === userId && !row.revokedAt) row.revokedAt = new Date();
    }
  }
  async deleteExpired() {
    let count = 0;
    for (const [id, row] of this.rows) {
      if (row.expiresAt < new Date()) {
        this.rows.delete(id);
        count++;
      }
    }
    return count;
  }
}

export class FakePasswordResetTokenRepository implements IPasswordResetTokenRepository {
  public rows = new Map<string, PasswordResetToken>();

  async create(entity: Partial<PasswordResetToken>) {
    const row: PasswordResetToken = {
      id: uuidv4(),
      userId: entity.userId ?? '',
      tokenHash: entity.tokenHash ?? '',
      expiresAt: entity.expiresAt ?? new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    };
    this.rows.set(row.id, row);
    return row;
  }
  async findByTokenHash(tokenHash: string) {
    return [...this.rows.values()].find((r) => r.tokenHash === tokenHash) ?? null;
  }
  async markUsed(id: string) {
    const row = this.rows.get(id);
    if (row) row.usedAt = new Date();
  }
  async invalidateAllForUser(userId: string) {
    for (const row of this.rows.values()) {
      if (row.userId === userId && !row.usedAt) row.usedAt = new Date();
    }
  }
}

export class FakeAuthAuditLogRepository implements IAuthAuditLogRepository {
  public entries: unknown[] = [];
  async record(entry: unknown) {
    this.entries.push(entry);
  }
}
