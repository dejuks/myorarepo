import { v4 as uuidv4 } from 'uuid';
import { Role } from '@domain/entities/role.entity';
import { UserRoleAssignment } from '@domain/entities/user-role-assignment.entity';
import { Article } from '@domain/entities/article.entity';
import { Revision } from '@domain/entities/revision.entity';
import { IRoleRepository } from '@domain/repositories/role.repository.interface';
import { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';
import { IArticleRepository, ListArticlesFilter, PaginatedResult } from '@domain/repositories/article.repository.interface';
import { IRevisionRepository } from '@domain/repositories/revision.repository.interface';

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

  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findBySlug(slug: string) {
    return [...this.rows.values()].find((a) => a.slug === slug) ?? null;
  }
  async slugExists(slug: string) {
    return [...this.rows.values()].some((a) => a.slug === slug);
  }
  async create(entity: Pick<Article, 'title' | 'slug' | 'createdBy'>) {
    const now = new Date();
    const row: Article = { id: uuidv4(), title: entity.title, slug: entity.slug, createdBy: entity.createdBy, createdAt: now, updatedAt: now };
    this.rows.set(row.id, row);
    return row;
  }
  async touch(id: string) {
    const row = this.rows.get(id);
    if (row) row.updatedAt = new Date();
  }
  async list(filter: ListArticlesFilter): Promise<PaginatedResult<Article>> {
    let items = [...this.rows.values()];
    if (filter.search) {
      const s = filter.search.toLowerCase();
      items = items.filter((a) => a.title.toLowerCase().includes(s));
    }
    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const total = items.length;
    const start = (filter.page - 1) * filter.pageSize;
    return { items: items.slice(start, start + filter.pageSize), total, page: filter.page, pageSize: filter.pageSize };
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
