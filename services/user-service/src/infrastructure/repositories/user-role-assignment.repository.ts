import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { UserRoleAssignment } from '@domain/entities/user-role-assignment.entity';
import { Role } from '@domain/entities/role.entity';
import { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';

export class UserRoleAssignmentRepository implements IUserRoleAssignmentRepository {
  private readonly repo: Repository<UserRoleAssignment>;

  constructor() {
    this.repo = AppDataSource.getRepository(UserRoleAssignment);
  }

  async assign(userId: string, roleId: string, assignedBy: string | null, expiresAt?: Date | null): Promise<UserRoleAssignment> {
    const existing = await this.repo.findOneBy({ userId, roleId });
    if (existing) {
      // Re-assigning an existing grant (e.g. renewing/changing its expiration) updates it in place rather than erroring.
      existing.expiresAt = expiresAt ?? null;
      return this.repo.save(existing);
    }
    const created = this.repo.create({ userId, roleId, assignedBy, expiresAt: expiresAt ?? null });
    return this.repo.save(created);
  }

  async revoke(userId: string, roleId: string): Promise<void> {
    await this.repo.delete({ userId, roleId });
  }

  async listRoleNamesForUser(userId: string): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('ura')
      .innerJoin(Role, 'r', 'r.id = ura.roleId')
      .select('r.name', 'name')
      .where('ura.userId = :userId', { userId })
      .andWhere('(ura.expiresAt IS NULL OR ura.expiresAt > NOW())')
      .getRawMany<{ name: string }>();
    return rows.map((r) => r.name);
  }

  async isAssigned(userId: string, roleId: string): Promise<boolean> {
    const count = await this.repo
      .createQueryBuilder('ura')
      .where('ura.userId = :userId', { userId })
      .andWhere('ura.roleId = :roleId', { roleId })
      .andWhere('(ura.expiresAt IS NULL OR ura.expiresAt > NOW())')
      .getCount();
    return count > 0;
  }
}
