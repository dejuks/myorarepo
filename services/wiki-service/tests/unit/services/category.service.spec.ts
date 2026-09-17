import { Category, CategoryStatus } from '@domain/entities/category.entity';
import { CreateCategoryInput, ICategoryRepository } from '@domain/repositories/category.repository.interface';
import { CategoryService } from '@application/services/category.service';
import { v4 as uuidv4 } from 'uuid';

class FakeCategoryRepository implements ICategoryRepository {
  public rows = new Map<string, Category>();

  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async list(language?: string) {
    let items = [...this.rows.values()];
    if (language) items = items.filter((c) => c.language === language);
    return items;
  }
  async create(input: CreateCategoryInput) {
    const now = new Date();
    const row: Category = {
      id: uuidv4(),
      name: input.name,
      description: input.description ?? null,
      parentCategoryId: input.parentCategoryId ?? null,
      language: input.language ?? 'om',
      status: CategoryStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(row.id, row);
    return row;
  }
  async delete(id: string) {
    this.rows.delete(id);
  }
  async hasChildren(id: string) {
    return [...this.rows.values()].some((c) => c.parentCategoryId === id);
  }
}

describe('CategoryService', () => {
  let repo: FakeCategoryRepository;
  let service: CategoryService;

  beforeEach(() => {
    repo = new FakeCategoryRepository();
    service = new CategoryService(repo);
  });

  it('creates a top-level category', async () => {
    const category = await service.createCategory({ name: 'History' });
    expect(category.name).toBe('History');
    expect(category.parentCategoryId).toBeNull();
    expect(category.language).toBe('om');
  });

  it('creates a child category under an existing parent', async () => {
    const parent = await service.createCategory({ name: 'Culture' });
    const child = await service.createCategory({ name: 'Festivals', parentCategoryId: parent.id });
    expect(child.parentCategoryId).toBe(parent.id);
  });

  it('rejects a parentCategoryId that does not exist', async () => {
    await expect(service.createCategory({ name: 'Orphan', parentCategoryId: uuidv4() })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('deletes a leaf category', async () => {
    const category = await service.createCategory({ name: 'Geography' });
    await service.deleteCategory(category.id);
    expect(await repo.findById(category.id)).toBeNull();
  });

  it('refuses to delete a category that still has children', async () => {
    const parent = await service.createCategory({ name: 'Politics' });
    await service.createCategory({ name: 'Governance', parentCategoryId: parent.id });
    await expect(service.deleteCategory(parent.id)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws NotFoundError deleting an unknown category', async () => {
    await expect(service.deleteCategory(uuidv4())).rejects.toMatchObject({ statusCode: 404 });
  });
});
