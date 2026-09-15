import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { Role } from '@domain/entities/role.entity';
import { IRoleRepository } from '@domain/repositories/role.repository.interface';

export class RoleRepository implements IRoleRepository {
  private readonly repo: Repository<Role>;

  constructor() {
    this.repo = AppDataSource.getRepository(Role);
  }

  async findById(id: string): Promise<Role | null> {
    return this.repo.findOneBy({ id });
  }

  async findByName(name: string): Promise<Role | null> {
    return this.repo.findOneBy({ name: name.toUpperCase() });
  }

  async create(entity: Partial<Role>): Promise<Role> {
    const created = this.repo.create({ ...entity, name: entity.name?.toUpperCase() });
    return this.repo.save(created);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  async listAll(): Promise<Role[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }
}
