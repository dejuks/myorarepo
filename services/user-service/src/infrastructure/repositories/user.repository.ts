import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { User } from '@domain/entities/user.entity';
import { IUserRepository, ListUsersFilter, PaginatedResult } from '@domain/repositories/user.repository.interface';

export class UserRepository implements IUserRepository {
  private readonly repo: Repository<User>;

  constructor() {
    this.repo = AppDataSource.getRepository(User);
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email: email.toLowerCase() });
  }

  async create(entity: Partial<User>): Promise<User> {
    const created = this.repo.create({ ...entity, email: entity.email?.toLowerCase() });
    return this.repo.save(created);
  }

  async update(id: string, changes: Partial<User>): Promise<User> {
    await this.repo.update({ id }, changes);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`User ${id} not found after update`);
    return updated;
  }

  async list(filter: ListUsersFilter): Promise<PaginatedResult<User>> {
    const qb = this.repo.createQueryBuilder('u');

    if (filter.status) {
      qb.andWhere('u.status = :status', { status: filter.status });
    }
    if (filter.search) {
      qb.andWhere('(u.email ILIKE :search OR u.firstName ILIKE :search OR u.lastName ILIKE :search)', {
        search: `%${filter.search}%`,
      });
    }

    qb.orderBy('u.createdAt', 'DESC')
      .skip((filter.page - 1) * filter.pageSize)
      .take(filter.pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: filter.page, pageSize: filter.pageSize };
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repo.countBy({ id });
    return count > 0;
  }
}
