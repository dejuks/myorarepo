import { Router } from 'express';
import { RoleController } from '@api/controllers/role.controller';
import { RoleService } from '@application/services/role.service';
import { RoleRepository } from '@infrastructure/repositories/role.repository';
import { validateDto } from '@api/middleware/validate-dto.middleware';
import { requireAuth, requireAdmin } from '@api/middleware/auth.middleware';
import { CreateRoleDto } from '@application/dto/create-role.dto';

const router = Router();
const roleService = new RoleService(new RoleRepository());
const controller = new RoleController(roleService);


/**
 * @openapi
 * /repository/roles:
 *   get:
 *     summary: List this module's role catalog
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Roles returned }
 */
router.get('/repository/roles', requireAuth, controller.list);

/**
 * @openapi
 * /repository/roles:
 *   post:
 *     summary: Create a custom role (platform ADMIN only — role catalog management is platform-level)
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Role created }
 *       409: { description: Role name already exists }
 */
router.post('/repository/roles', requireAuth, requireAdmin, validateDto(CreateRoleDto), controller.create);

/**
 * @openapi
 * /repository/roles/{id}:
 *   delete:
 *     summary: Delete a custom role (platform ADMIN only, system roles are protected)
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Role deleted }
 *       400: { description: Cannot delete a system role }
 */
router.delete('/repository/roles/:id', requireAuth, requireAdmin, controller.delete);

export { router as roleRouter };
