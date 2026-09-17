import { v4 as uuidv4 } from 'uuid';
import { Role } from '@domain/entities/role.entity';
import { UserRoleAssignment } from '@domain/entities/user-role-assignment.entity';
import { Article, ArticleStatus } from '@domain/entities/article.entity';
import { Revision } from '@domain/entities/revision.entity';
import { Tag } from '@domain/entities/tag.entity';
import { ArticleReview } from '@domain/entities/article-review.entity';
import { IRoleRepository } from '@domain/repositories/role.repository.interface';
import { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';
import {
  CreateArticleInput,
  IArticleRepository,
  ListArticlesFilter,
  PaginatedResult,
  UpdateArticleMetadataInput,
} from '@domain/repositories/article.repository.interface';
import { IRevisionRepository } from '@domain/repositories/revision.repository.interface';
import { ITagRepository } from '@domain/repositories/tag.repository.interface';
import { CreateArticleReviewInput, IArticleReviewRepository } from '@domain/repositories/article-review.repository.interface';

export class FakeRoleRepository implements IRoleRepository {
  public rows = new Map<string, Role>();

  seed(names: string[]) {
    for (const name of names) {
      const role: Role = { id: uuidv4(), name, description: null, isSystem: true, createdAt: new Date() };
      this.rows.set(role.id, role);
    }
  }

  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findByName(name: string) {
    return [...this.rows.values()].find((r) => r.name === name.toUpperCase()) ?? null;
  }
  async create(entity: Partial<Role>) {
    const row: Role = {
      id: uuidv4(),
      name: (entity.name ?? '').toUpperCase(),
      description: entity.description ?? null,
      isSystem: entity.isSystem ?? false,
      createdAt: new Date(),
    };
    this.rows.set(row.id, row);
    return row;
  }
  async delete(id: string) {
    this.rows.delete(id);
  }
  async listAll() {
    return [...this.rows.values()];
  }
}

export class FakeUserRoleAssignmentRepository implements IUserRoleAssignmentRepository {
  public rows: UserRoleAssignment[] = [];

  /** Mirrors the real repository's join against roles — takes the same FakeRoleRepository instance the test wires up. */
  constructor(private readonly roleRepo: FakeRoleRepository) {}

  async assign(userId: string, roleId: string, assignedBy: string | null) {
    const existing = this.rows.find((r) => r.userId === userId && r.roleId === roleId);
    if (existing) return existing;
    const row: UserRoleAssignment = { userId, roleId, assignedBy, assignedAt: new Date() };
    this.rows.push(row);
    return row;
  }
  async revoke(userId: string, roleId: string) {
    this.rows = this.rows.filter((r) => !(r.userId === userId && r.roleId === roleId));
  }
  async listRoleNamesForUser(userId: string): Promise<string[]> {
    const roleIds = this.rows.filter((r) => r.userId === userId).map((r) => r.roleId);
    const names: string[] = [];
    for (const roleId of roleIds) {
      const role = await this.roleRepo.findById(roleId);
      if (role) names.push(role.name);
    }
    return names;
  }
  async isAssigned(userId: string, roleId: string) {
    return this.rows.some((r) => r.userId === userId && r.roleId === roleId);
  }
}

export class FakeArticleRepository implements IArticleRepository {
  public rows = new Map<string, Article>();
  public tagLinks = new Map<string, Set<string>>();

  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findBySlug(slug: string) {
    return [...this.rows.values()].find((a) => a.slug === slug) ?? null;
  }
  async slugExists(slug: string) {
    return [...this.rows.values()].some((a) => a.slug === slug);
  }
  async create(entity: CreateArticleInput) {
    const now = new Date();
    const row: Article = {
      id: uuidv4(),
      title: entity.title,
      slug: entity.slug,
      summary: entity.summary ?? null,
      language: entity.language ?? 'om',
      categoryId: entity.categoryId ?? null,
      featuredImageUrl: entity.featuredImageUrl ?? null,
      status: ArticleStatus.DRAFT,
      publishedAt: null,
      createdBy: entity.createdBy,
      createdAt: now,
      updatedAt: now,
      searchVector: null,
    };
    this.rows.set(row.id, row);
    return row;
  }
  async touch(id: string, metadata?: UpdateArticleMetadataInput) {
    const row = this.rows.get(id);
    if (row) {
      row.updatedAt = new Date();
      if (metadata) Object.assign(row, metadata);
    }
  }
  async setStatus(id: string, status: ArticleStatus, publishedAt?: Date | null) {
    const row = this.rows.get(id);
    if (row) {
      row.status = status;
      if (publishedAt !== undefined) row.publishedAt = publishedAt;
    }
  }
  async list(filter: ListArticlesFilter): Promise<PaginatedResult<Article>> {
    let items = [...this.rows.values()];
    if (filter.search) {
      const s = filter.search.toLowerCase();
      items = items.filter((a) => a.title.toLowerCase().includes(s) || (a.summary ?? '').toLowerCase().includes(s));
    }
    if (filter.language) items = items.filter((a) => a.language === filter.language);
    if (filter.categoryId) items = items.filter((a) => a.categoryId === filter.categoryId);
    if (filter.authorId) items = items.filter((a) => a.createdBy === filter.authorId);
    if (filter.tagId) items = items.filter((a) => this.tagLinks.get(a.id)?.has(filter.tagId as string));
    if (filter.from) items = items.filter((a) => a.createdAt >= (filter.from as Date));
    if (filter.to) items = items.filter((a) => a.createdAt <= (filter.to as Date));
    if (filter.visibleStatuses?.length) {
      items = items.filter((a) => filter.visibleStatuses!.includes(a.status) || a.createdBy === filter.viewerUserId);
    }
    if (filter.status) items = items.filter((a) => a.status === filter.status);

    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const total = items.length;
    const start = (filter.page - 1) * filter.pageSize;
    return { items: items.slice(start, start + filter.pageSize), total, page: filter.page, pageSize: filter.pageSize };
  }
  async setTags(articleId: string, tagIds: string[]) {
    this.tagLinks.set(articleId, new Set(tagIds));
  }
  async listTagIdsForArticle(articleId: string) {
    return [...(this.tagLinks.get(articleId) ?? [])];
  }
}

export class FakeRevisionRepository implements IRevisionRepository {
  public rows: Revision[] = [];

  async create(entity: Pick<Revision, 'articleId' | 'content' | 'editSummary' | 'editorUserId'>) {
    const row: Revision = {
      id: uuidv4(),
      articleId: entity.articleId,
      content: entity.content,
      editSummary: entity.editSummary,
      editorUserId: entity.editorUserId,
      createdAt: new Date(),
    };
    this.rows.push(row);
    return row;
  }
  async findById(id: string) {
    return this.rows.find((r) => r.id === id) ?? null;
  }
  /**
   * "Newest first" ordered by insertion (this.rows is already chronological,
   * since create() always appends) rather than by comparing `createdAt`
   * directly — two revisions saved back-to-back in a synchronous test can
   * land on the exact same millisecond, which would make a Date-based sort
   * non-deterministic. The real repository doesn't have this problem
   * (Postgres' `now()` has microsecond precision), but the fake needs to be
   * deterministic regardless of how fast the test runs.
   */
  private newestFirst(articleId: string): Revision[] {
    return this.rows.filter((r) => r.articleId === articleId).reverse();
  }
  async findLatestForArticle(articleId: string) {
    return this.newestFirst(articleId)[0] ?? null;
  }
  async listForArticle(articleId: string, page: number, pageSize: number) {
    const items = this.newestFirst(articleId);
    const total = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total, page, pageSize };
  }
}

export class FakeTagRepository implements ITagRepository {
  public rows = new Map<string, Tag>();

  async list(language?: string) {
    let items = [...this.rows.values()];
    if (language) items = items.filter((t) => t.language === language);
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findByIds(ids: string[]) {
    return ids.map((id) => this.rows.get(id)).filter((t): t is Tag => Boolean(t));
  }
  async findByName(name: string, language: string) {
    return [...this.rows.values()].find((t) => t.name.toLowerCase() === name.toLowerCase() && t.language === language) ?? null;
  }
  async create(name: string, language: string, description: string | null = null) {
    const row: Tag = { id: uuidv4(), name, description, language, createdAt: new Date() };
    this.rows.set(row.id, row);
    return row;
  }
  async findOrCreateMany(names: string[], language: string) {
    const seen = new Map<string, string>();
    for (const raw of names) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) seen.set(key, trimmed);
    }

    const tags: Tag[] = [];
    for (const name of seen.values()) {
      const existing = await this.findByName(name, language);
      tags.push(existing ?? (await this.create(name, language)));
    }
    return tags;
  }
  async delete(id: string) {
    this.rows.delete(id);
  }
}

export class FakeArticleReviewRepository implements IArticleReviewRepository {
  public rows: ArticleReview[] = [];

  async create(input: CreateArticleReviewInput) {
    const row: ArticleReview = {
      id: uuidv4(),
      articleId: input.articleId,
      reviewerUserId: input.reviewerUserId,
      decision: input.decision,
      comment: input.comment ?? null,
      createdAt: new Date(),
    };
    this.rows.push(row);
    return row;
  }
  async listForArticle(articleId: string) {
    return this.rows.filter((r) => r.articleId === articleId).reverse();
  }
}
