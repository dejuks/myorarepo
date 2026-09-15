import { Router } from 'express';
import { TemplateController } from '@api/controllers/template.controller';
import { TemplateService } from '@application/services/template.service';
import { NotificationTemplateRepository } from '@infrastructure/repositories/notification-template.repository';
import { requireAuth, requireRoles } from '@api/middleware/auth.middleware';
import { validateDto } from '@api/middleware/validate-dto.middleware';
import { CreateTemplateDto } from '@application/dto/create-template.dto';
import { UpdateTemplateDto } from '@application/dto/update-template.dto';

const router = Router();
const templateService = new TemplateService(new NotificationTemplateRepository());
const controller = new TemplateController(templateService);

const ADMIN = 'ADMIN';

/**
 * @openapi
 * /notification-templates:
 *   get:
 *     summary: List all notification templates (admin only)
 *     tags: [Templates]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Templates returned }
 */
router.get('/notification-templates', requireAuth, requireRoles(ADMIN), controller.list);

/**
 * @openapi
 * /notification-templates:
 *   post:
 *     summary: Create a notification template (admin only)
 *     tags: [Templates]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Template created }
 *       409: { description: A template for this code/channel already exists }
 */
router.post('/notification-templates', requireAuth, requireRoles(ADMIN), validateDto(CreateTemplateDto), controller.create);

/**
 * @openapi
 * /notification-templates/{id}:
 *   patch:
 *     summary: Update a notification template (admin only)
 *     tags: [Templates]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Template updated }
 *       404: { description: Not found }
 */
router.patch('/notification-templates/:id', requireAuth, requireRoles(ADMIN), validateDto(UpdateTemplateDto), controller.update);

export { router as templateRouter };
