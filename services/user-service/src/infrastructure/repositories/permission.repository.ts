import { In, Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { Permission } from '@domain/entities/permission.entity';
import { IPermissionRepository } from '@domain/repositories/permission.repository.interface';

export class PermissionRepository implements IPermissionRepository {
  private readonly repo: Repository<Permission>;

  constructor() {
    this.repo = AppDataSource.getRepository(Permission);
  }

  async listAll(): Promise<Permission[]> {
    return this.repo.find({ order: { category: 'ASC', label: 'ASC' } });
  }

  async findByKey(key: string): Promise<Permission | null> {
    return this.repo.findOneBy({ key });
  }

  async findByKeys(keys: string[]): Promise<Permission[]> {
    if (keys.length === 0) return [];
    return this.repo.findBy({ key: In(keys) });
  }
}
