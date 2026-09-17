import { Permission } from '@domain/entities/permission.entity';

export interface IPermissionRepository {
  listAll(): Promise<Permission[]>;
  findByKey(key: string): Promise<Permission | null>;
  findByKeys(keys: string[]): Promise<Permission[]>;
}
