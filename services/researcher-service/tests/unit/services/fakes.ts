import { v4 as uuidv4 } from 'uuid';
import { Role } from '@domain/entities/role.entity';
import { UserRoleAssignment } from '@domain/entities/user-role-assignment.entity';
import { IRoleRepository } from '@domain/repositories/role.repository.interface';
import { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';

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
