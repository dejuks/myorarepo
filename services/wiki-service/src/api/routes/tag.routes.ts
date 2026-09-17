import { Router } from 'express';
import { TagController } from '@api/controllers/tag.controller';
import { TagService } from '@application/services/tag.service';
import { TagRepository } from '@infrastructure/repositories/tag.repository';
import { validateDto } from '@api/middleware/validate-dto.middleware';
import { requireAuth } from '@api/middleware/auth.middleware';
import { CreateTagDto } from '@application/dto/create-tag.dto';

const router = Router();
const tagService = new TagService(new TagRepository());
const controller = new TagController(tagService);

/**
 * @openapi
 * /tags:
 *   get:
 *     summary: List tags (public), optionally filtered by language
 *     tags: [Tags]
 *     responses:
 *       200: { description: Tags returned }
 */
router.get('/tags', controller.list);

/**
 * @openapi
 * /tags:
 *   post:
 *     summary: Create a tag (any authenticated account — tags can also be created inline while tagging an article)
 *     tags: [Tags]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateTagDto' }
 *     responses:
 *       201: { description: Tag created }
 *       409: { description: Tag already exists for this language }
 */
router.post('/tags', requireAuth, validateDto(CreateTagDto), controller.create);

/**
 * @openapi
 * /tags/{id}:
 *   delete:
 *     summary: Delete a tag
 *     tags: [Tags]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Tag deleted }
 *       404: { description: Not found }
 */
router.delete('/tags/:id', requireAuth, controller.delete);

export { router as tagRouter };
