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

  async assign(userId: string, roleId: string, assignedBy: string | null): Promise<UserRoleAssignment> {
    const existing = await this.repo.findOneBy({ userId, roleId });
    if (existing) return existing;
    const created = this.repo.create({ userId, roleId, assignedBy });
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
      .getRawMany<{ name: string }>();
    return rows.map((r) => r.name);
  }

  async isAssigned(userId: string, roleId: string): Promise<boolean> {
    const count = await this.repo.countBy({ userId, roleId });
    return count > 0;
  }
}
