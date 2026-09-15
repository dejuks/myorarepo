import { v4 as uuidv4 } from 'uuid';
import { Notification, NotificationStatus, NotificationChannel } from '@domain/entities/notification.entity';
import { NotificationTemplate } from '@domain/entities/notification-template.entity';
import { UserContactCache } from '@domain/entities/user-contact-cache.entity';
import { INotificationRepository, ListNotificationsFilter, PaginatedResult } from '@domain/repositories/notification.repository.interface';
import { INotificationTemplateRepository } from '@domain/repositories/notification-template.repository.interface';
import { IUserContactCacheRepository } from '@domain/repositories/user-contact-cache.repository.interface';
import { IEmailProvider, SendEmailInput } from '@infrastructure/providers/email-provider.interface';

export class FakeNotificationRepository implements INotificationRepository {
  public rows = new Map<string, Notification>();

  async create(entity: Partial<Notification>) {
    const row: Notification = {
      id: uuidv4(),
      userId: entity.userId ?? '',
      channel: entity.channel ?? NotificationChannel.IN_APP,
      templateCode: entity.templateCode ?? '',
      subject: entity.subject ?? null,
      body: entity.body ?? '',
      status: entity.status ?? NotificationStatus.PENDING,
      metadata: entity.metadata ?? null,
      errorMessage: null,
      readAt: null,
      sentAt: null,
      createdAt: new Date(),
    };
    this.rows.set(row.id, row);
    return row;
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async updateStatus(id: string, status: NotificationStatus, errorMessage: string | null = null) {
    const row = this.rows.get(id);
    if (row) {
      row.status = status;
      row.errorMessage = errorMessage;
      if (status === NotificationStatus.SENT) row.sentAt = new Date();
    }
  }
  async markRead(id: string) {
    const row = this.rows.get(id);
    if (row) row.readAt = new Date();
  }
  async markAllReadForUser(userId: string) {
    let count = 0;
    for (const row of this.rows.values()) {
      if (row.userId === userId && !row.readAt) {
        row.readAt = new Date();
        count++;
      }
    }
    return count;
  }
  async listForUser(filter: ListNotificationsFilter): Promise<PaginatedResult<Notification>> {
    let items = [...this.rows.values()].filter((r) => r.userId === filter.userId);
    if (filter.unreadOnly) items = items.filter((r) => !r.readAt);
    items = items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = items.length;
    const start = (filter.page - 1) * filter.pageSize;
    return { items: items.slice(start, start + filter.pageSize), total, page: filter.page, pageSize: filter.pageSize };
  }
  async countUnreadForUser(userId: string) {
    return [...this.rows.values()].filter((r) => r.userId === userId && !r.readAt).length;
  }
}

export class FakeNotificationTemplateRepository implements INotificationTemplateRepository {
  public rows = new Map<string, NotificationTemplate>();

  seed(entries: Array<Partial<NotificationTemplate> & { code: string; channel: NotificationChannel; bodyTemplate: string }>) {
    for (const e of entries) {
      const row: NotificationTemplate = {
        id: uuidv4(),
        code: e.code,
        channel: e.channel,
        subject: e.subject ?? null,
        bodyTemplate: e.bodyTemplate,
        isActive: e.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.rows.set(row.id, row);
    }
  }

  async findByCodeAndChannel(code: string, channel: NotificationChannel) {
    return [...this.rows.values()].find((r) => r.code === code && r.channel === channel && r.isActive) ?? null;
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async create(entity: Partial<NotificationTemplate>) {
    const row: NotificationTemplate = {
      id: uuidv4(),
      code: entity.code ?? '',
      channel: entity.channel ?? NotificationChannel.EMAIL,
      subject: entity.subject ?? null,
      bodyTemplate: entity.bodyTemplate ?? '',
      isActive: entity.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rows.set(row.id, row);
    return row;
  }
  async update(id: string, changes: Partial<NotificationTemplate>) {
    const row = this.rows.get(id);
    if (!row) throw new Error('not found');
    Object.assign(row, changes, { updatedAt: new Date() });
    return row;
  }
  async listAll() {
    return [...this.rows.values()];
  }
}

export class FakeUserContactCacheRepository implements IUserContactCacheRepository {
  public rows = new Map<string, UserContactCache>();

  async findByUserId(userId: string) {
    return this.rows.get(userId) ?? null;
  }
  async upsert(userId: string, changes: Partial<UserContactCache>) {
    const existing = this.rows.get(userId);
    const row: UserContactCache = existing
      ? { ...existing, ...changes, updatedAt: new Date() }
      : { userId, email: changes.email ?? null, phone: changes.phone ?? null, updatedAt: new Date() };
    this.rows.set(userId, row);
    return row;
  }
}

export class FakeEmailProvider implements IEmailProvider {
  public sent: SendEmailInput[] = [];
  public shouldFail = false;

  async send(input: SendEmailInput): Promise<void> {
    if (this.shouldFail) throw new Error('Simulated email provider failure');
    this.sent.push(input);
  }
}
