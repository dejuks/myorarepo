import { Router } from 'express';
import { CategoryController } from '@api/controllers/category.controller';
import { CategoryService } from '@application/services/category.service';
import { CategoryRepository } from '@infrastructure/repositories/category.repository';
import { validateDto } from '@api/middleware/validate-dto.middleware';
import { requireAuth } from '@api/middleware/auth.middleware';
import { CreateCategoryDto } from '@application/dto/create-category.dto';

const router = Router();
const categoryService = new CategoryService(new CategoryRepository());
const controller = new CategoryController(categoryService);

/**
 * @openapi
 * /categories:
 *   get:
 *     summary: List categories (public), optionally filtered by language
 *     tags: [Categories]
 *     responses:
 *       200: { description: Categories returned }
 */
router.get('/categories', controller.list);

/**
 * @openapi
 * /categories:
 *   post:
 *     summary: Create a category (any authenticated account — same editing philosophy as articles/tags)
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateCategoryDto' }
 *     responses:
 *       201: { description: Category created }
 */
router.post('/categories', requireAuth, validateDto(CreateCategoryDto), controller.create);

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     summary: Delete a category (blocked while it still has child categories)
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Category deleted }
 *       404: { description: Not found }
 *       409: { description: Category still has child categories }
 */
router.delete('/categories/:id', requireAuth, controller.delete);

export { router as categoryRouter };
