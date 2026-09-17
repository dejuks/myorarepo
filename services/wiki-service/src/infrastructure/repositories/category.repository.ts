import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/database/data-source';
import { Category } from '@domain/entities/category.entity';
import { CreateCategoryInput, ICategoryRepository } from '@domain/repositories/category.repository.interface';

export class CategoryRepository implements ICategoryRepository {
  private readonly repo: Repository<Category>;

  constructor() {
    this.repo = AppDataSource.getRepository(Category);
  }

  async findById(id: string): Promise<Category | null> {
    return this.repo.findOneBy({ id });
  }

  async list(language?: string): Promise<Category[]> {
    return this.repo.find({
      where: language ? { language } : {},
      order: { name: 'ASC' },
    });
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const created = this.repo.create({
      name: input.name,
      description: input.description ?? null,
      parentCategoryId: input.parentCategoryId ?? null,
      language: input.language ?? 'om',
    });
    return this.repo.save(created);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  async hasChildren(id: string): Promise<boolean> {
    const count = await this.repo.countBy({ parentCategoryId: id });
    return count > 0;
  }
}
