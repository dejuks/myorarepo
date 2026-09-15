import { User, UserStatus } from '@domain/entities/user.entity';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListUsersFilter {
  status?: UserStatus;
  search?: string; // matches email, firstName, lastName
  page: number;
  pageSize: number;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(entity: Partial<User>): Promise<User>;
  update(id: string, changes: Partial<User>): Promise<User>;
  list(filter: ListUsersFilter): Promise<PaginatedResult<User>>;
  exists(id: string): Promise<boolean>;
}
