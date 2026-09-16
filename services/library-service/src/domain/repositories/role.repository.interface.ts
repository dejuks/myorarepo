import { Role } from '@domain/entities/role.entity';

export interface IRoleRepository {
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  create(entity: Partial<Role>): Promise<Role>;
  delete(id: string): Promise<void>;
  listAll(): Promise<Role[]>;
}
