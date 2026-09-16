import { Router } from 'express';
import { RoleController } from '@api/controllers/role.controller';
import { RoleService } from '@application/services/role.service';
import { RoleRepository } from '@infrastructure/repositories/role.repository';
import { validateDto } from '@api/middleware/validate-dto.middleware';
import { requireAuth, requireRoles } from '@api/middleware/auth.middleware';
import { CreateRoleDto } from '@application/dto/create-role.dto';

const router = Router();
const roleService = new RoleService(new RoleRepository());
const controller = new RoleController(roleService);

const TOP_ROLE = 'JOURNAL_MANAGER';

/**
 * @openapi
 * /roles:
 *   get:
 *     summary: List this module's role catalog
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Roles returned }
 */
router.get('/roles', requireAuth, controller.list);

/**
 * @openapi
 * /roles:
 *   post:
 *     summary: Create a custom role (JOURNAL_MANAGER only)
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Role created }
 *       409: { description: Role name already exists }
 */
router.post('/roles', requireAuth, requireRoles(TOP_ROLE), validateDto(CreateRoleDto), controller.create);

/**
 * @openapi
 * /roles/{id}:
 *   delete:
 *     summary: Delete a custom role (JOURNAL_MANAGER only, system roles are protected)
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Role deleted }
 *       400: { description: Cannot delete a system role }
 */
router.delete('/roles/:id', requireAuth, requireRoles(TOP_ROLE), controller.delete);

export { router as roleRouter };
