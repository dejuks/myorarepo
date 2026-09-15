import { AuthAuditEventType } from '@domain/entities/auth-audit-log.entity';

export interface IAuthAuditLogRepository {
  record(entry: {
    userId?: string | null;
    eventType: AuthAuditEventType;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void>;
}
