import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { RolePermission } from '@domain/entities/role-permission.entity';
import { Permission } from '@domain/entities/permission.entity';
import { Role } from '@domain/entities/role.entity';
import { IRolePermissionRepository } from '@domain/repositories/role-permission.repository.interface';

export class RolePermissionRepository implements IRolePermissionRepository {
  private readonly repo: Repository<RolePermission>;

  constructor() {
    this.repo = AppDataSource.getRepository(RolePermission);
  }

  async listPermissionKeysForRole(roleId: string): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('rp')
      .innerJoin(Permission, 'p', 'p.id = rp.permissionId')
      .select('p.key', 'key')
      .where('rp.roleId = :roleId', { roleId })
      .getRawMany<{ key: string }>();
    return rows.map((r) => r.key);
  }

  async listPermissionKeysForRoleNames(roleNames: string[]): Promise<string[]> {
    if (roleNames.length === 0) return [];
    const rows = await this.repo
      .createQueryBuilder('rp')
      .innerJoin(Permission, 'p', 'p.id = rp.permissionId')
      .innerJoin(Role, 'r', 'r.id = rp.roleId')
      .select('p.key', 'key')
      .where('r.name IN (:...roleNames)', { roleNames })
      .getRawMany<{ key: string }>();
    return [...new Set(rows.map((r) => r.key))];
  }

  async setForRole(roleId: string, permissionIds: string[]): Promise<void> {
    await AppDataSource.transaction(async (manager) => {
      await manager.delete(RolePermission, { roleId });
      if (permissionIds.length > 0) {
        const rows = permissionIds.map((permissionId) => manager.create(RolePermission, { roleId, permissionId }));
        await manager.save(rows);
      }
    });
  }
}
