import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '@application/services/category.service';
import { CreateCategoryDto } from '@application/dto/create-category.dto';

export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const language = typeof req.query.language === 'string' ? req.query.language : undefined;
      const categories = await this.categoryService.listCategories(language);
      res.status(200).json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request<unknown, unknown, CreateCategoryDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const category = await this.categoryService.createCategory(req.body);
      res.status(201).json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.categoryService.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
