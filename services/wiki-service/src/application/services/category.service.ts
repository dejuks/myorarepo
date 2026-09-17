import { Category } from '@domain/entities/category.entity';
import { ICategoryRepository } from '@domain/repositories/category.repository.interface';
import { CreateCategoryDto } from '@application/dto/create-category.dto';
import { ConflictError, NotFoundError, ValidationError } from '@common/errors/app-error';

/**
 * Hierarchical topic categories — spec section "4. Categories". Any
 * authenticated editor can create one (same philosophy as tags and article
 * creation itself — see ArticleService's doc comment). Deleting a category
 * that still has child categories is blocked (the tree would otherwise be
 * silently flattened); deleting one that still has articles filed under it
 * is allowed — the FK is ON DELETE SET NULL, so those articles simply
 * become uncategorized rather than being blocked or cascaded away.
 */
export class CategoryService {
  constructor(private readonly categoryRepo: ICategoryRepository) {}

  async listCategories(language?: string): Promise<Category[]> {
    return this.categoryRepo.list(language);
  }

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    if (dto.parentCategoryId) {
      const parent = await this.categoryRepo.findById(dto.parentCategoryId);
      if (!parent) throw new ValidationError('parentCategoryId does not refer to an existing category');
    }
    return this.categoryRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      parentCategoryId: dto.parentCategoryId ?? null,
      language: dto.language,
    });
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw new NotFoundError('Category not found');

    if (await this.categoryRepo.hasChildren(id)) {
      throw new ConflictError('Cannot delete a category that has child categories — move or delete them first');
    }
    await this.categoryRepo.delete(id);
  }
}
