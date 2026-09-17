import { v4 as uuidv4 } from 'uuid';
import { User, UserStatus } from '@domain/entities/user.entity';
import { Role } from '@domain/entities/role.entity';
import { UserRoleAssignment } from '@domain/entities/user-role-assignment.entity';
import { Permission } from '@domain/entities/permission.entity';
import { IUserRepository, ListUsersFilter, PaginatedResult } from '@domain/repositories/user.repository.interface';
import { IRoleRepository } from '@domain/repositories/role.repository.interface';
import { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';
import { IPermissionRepository } from '@domain/repositories/permission.repository.interface';
import { IRolePermissionRepository } from '@domain/repositories/role-permission.repository.interface';

export class FakeUserRepository implements IUserRepository {
  public rows = new Map<string, User>();

  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findByEmail(email: string) {
    return [...this.rows.values()].find((r) => r.email === email.toLowerCase()) ?? null;
  }
  async create(entity: Partial<User>) {
    const row: User = {
      id: entity.id ?? uuidv4(),
      email: (entity.email ?? '').toLowerCase(),
      firstName: entity.firstName ?? '',
      lastName: entity.lastName ?? '',
      displayName: entity.displayName ?? null,
      avatarUrl: entity.avatarUrl ?? null,
      bio: entity.bio ?? null,
      phone: entity.phone ?? null,
      locale: entity.locale ?? 'en',
      gender: entity.gender ?? null,
      dateOfBirth: entity.dateOfBirth ?? null,
      address: entity.address ?? null,
      country: entity.country ?? null,
      region: entity.region ?? null,
      city: entity.city ?? null,
      timezone: entity.timezone ?? null,
      status: entity.status ?? UserStatus.PENDING,
      deactivatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rows.set(row.id, row);
    return row;
  }
  async update(id: string, changes: Partial<User>) {
    const row = this.rows.get(id);
    if (!row) throw new Error('not found');
    Object.assign(row, changes, { updatedAt: new Date() });
    return row;
  }
  async list(filter: ListUsersFilter): Promise<PaginatedResult<User>> {
    let items = [...this.rows.values()];
    if (filter.status) items = items.filter((u) => u.status === filter.status);
    if (filter.search) {
      const s = filter.search.toLowerCase();
      items = items.filter((u) => u.email.includes(s) || u.firstName.toLowerCase().includes(s) || u.lastName.toLowerCase().includes(s));
    }
    const total = items.length;
    const start = (filter.page - 1) * filter.pageSize;
    return { items: items.slice(start, start + filter.pageSize), total, page: filter.page, pageSize: filter.pageSize };
  }
  async exists(id: string) {
    return this.rows.has(id);
  }
}

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

  async assign(userId: string, roleId: string, assignedBy: string | null, expiresAt?: Date | null) {
    const existing = this.rows.find((r) => r.userId === userId && r.roleId === roleId);
    if (existing) {
      existing.expiresAt = expiresAt ?? null;
      return existing;
    }
    const row: UserRoleAssignment = { userId, roleId, assignedBy, assignedAt: new Date(), expiresAt: expiresAt ?? null };
    this.rows.push(row);
    return row;
  }
  async revoke(userId: string, roleId: string) {
    this.rows = this.rows.filter((r) => !(r.userId === userId && r.roleId === roleId));
  }
  private notExpired(r: UserRoleAssignment): boolean {
    return !r.expiresAt || r.expiresAt.getTime() > Date.now();
  }
  async listRoleNamesForUser(userId: string): Promise<string[]> {
    const roleIds = this.rows.filter((r) => r.userId === userId && this.notExpired(r)).map((r) => r.roleId);
    const names: string[] = [];
    for (const roleId of roleIds) {
      const role = await this.roleRepo.findById(roleId);
      if (role) names.push(role.name);
    }
    return names;
  }
  async isAssigned(userId: string, roleId: string) {
    return this.rows.some((r) => r.userId === userId && r.roleId === roleId && this.notExpired(r));
  }
}

export class FakePermissionRepository implements IPermissionRepository {
  public rows = new Map<string, Permission>();

  /** Seeds a fixed catalog like the real migration does. Returns key -> id for convenience in tests. */
  seed(entries: Array<{ key: string; category: string; label: string }>): Record<string, string> {
    const ids: Record<string, string> = {};
    for (const entry of entries) {
      const permission: Permission = { id: uuidv4(), key: entry.key, category: entry.category, label: entry.label, description: null, createdAt: new Date() };
      this.rows.set(permission.id, permission);
      ids[entry.key] = permission.id;
    }
    return ids;
  }

  async listAll() {
    return [...this.rows.values()];
  }
  async findByKey(key: string) {
    return [...this.rows.values()].find((p) => p.key === key) ?? null;
  }
  async findByKeys(keys: string[]) {
    return [...this.rows.values()].filter((p) => keys.includes(p.key));
  }
}

export class FakeRolePermissionRepository implements IRolePermissionRepository {
  /** roleId -> Set<permissionId> */
  public grants = new Map<string, Set<string>>();

  constructor(
    private readonly roleRepo: FakeRoleRepository,
    private readonly permissionRepo: FakePermissionRepository,
  ) {}

  async listPermissionKeysForRole(roleId: string): Promise<string[]> {
    const permissionIds = [...(this.grants.get(roleId) ?? [])];
    const keys: string[] = [];
    for (const id of permissionIds) {
      const permission = this.permissionRepo.rows.get(id);
      if (permission) keys.push(permission.key);
    }
    return keys;
  }

  async listPermissionKeysForRoleNames(roleNames: string[]): Promise<string[]> {
    const roleIds = [...this.roleRepo.rows.values()].filter((r) => roleNames.includes(r.name)).map((r) => r.id);
    const keys = new Set<string>();
    for (const roleId of roleIds) {
      for (const key of await this.listPermissionKeysForRole(roleId)) keys.add(key);
    }
    return [...keys];
  }

  async setForRole(roleId: string, permissionIds: string[]): Promise<void> {
    this.grants.set(roleId, new Set(permissionIds));
  }
}
