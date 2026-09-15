import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { AuthAuditLog, AuthAuditEventType } from '@domain/entities/auth-audit-log.entity';
import { IAuthAuditLogRepository } from '@domain/repositories/auth-audit-log.repository.interface';
import { logger } from '@common/logger/logger';

export class AuthAuditLogRepository implements IAuthAuditLogRepository {
  private readonly repo: Repository<AuthAuditLog>;

  constructor() {
    this.repo = AppDataSource.getRepository(AuthAuditLog);
  }

  async record(entry: {
    userId?: string | null;
    eventType: AuthAuditEventType;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    try {
      const row = this.repo.create({
        userId: entry.userId ?? null,
        eventType: entry.eventType,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        metadata: entry.metadata ?? null,
      });
      await this.repo.save(row);
    } catch (err) {
      // Audit logging must never crash the primary request flow.
      logger.error({ err }, 'Failed to write auth audit log entry');
    }
  }
}
