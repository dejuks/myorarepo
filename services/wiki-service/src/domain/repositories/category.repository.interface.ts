import { Category } from '@domain/entities/category.entity';

export interface CreateCategoryInput {
  name: string;
  description?: string | null;
  parentCategoryId?: string | null;
  language?: string;
}

export interface ICategoryRepository {
  findById(id: string): Promise<Category | null>;
  list(language?: string): Promise<Category[]>;
  create(input: CreateCategoryInput): Promise<Category>;
  delete(id: string): Promise<void>;
  hasChildren(id: string): Promise<boolean>;
}
