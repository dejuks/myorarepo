import { Router } from 'express';
import { MemberRoleController } from '@api/controllers/member-role.controller';
import { MemberRoleService } from '@application/services/member-role.service';
import { RoleRepository } from '@infrastructure/repositories/role.repository';
import { UserRoleAssignmentRepository } from '@infrastructure/repositories/user-role-assignment.repository';
import { validateDto } from '@api/middleware/validate-dto.middleware';
import { requireAuth, requireRoles, requireSelfOrRoles } from '@api/middleware/auth.middleware';
import { AssignRoleDto } from '@application/dto/assign-role.dto';

const router = Router();
const memberRoleService = new MemberRoleService(new RoleRepository(), new UserRoleAssignmentRepository());
const controller = new MemberRoleController(memberRoleService);

const TOP_ROLE = 'JOURNAL_MANAGER';

/**
 * @openapi
 * /members/{userId}/roles:
 *   get:
 *     summary: List a member's roles in this module (self or JOURNAL_MANAGER)
 *     tags: [Members]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Roles returned }
 */
router.get('/members/:userId/roles', requireAuth, requireSelfOrRoles('userId', TOP_ROLE), controller.list);

/**
 * @openapi
 * /members/{userId}/roles:
 *   post:
 *     summary: Assign a role to a member (JOURNAL_MANAGER only)
 *     tags: [Members]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Role assigned }
 *       404: { description: Role does not exist }
 */
router.post('/members/:userId/roles', requireAuth, requireRoles(TOP_ROLE), validateDto(AssignRoleDto), controller.assign);

/**
 * @openapi
 * /members/{userId}/roles/{roleName}:
 *   delete:
 *     summary: Revoke a role from a member (JOURNAL_MANAGER only)
 *     tags: [Members]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Role revoked }
 *       404: { description: Role does not exist }
 */
router.delete('/members/:userId/roles/:roleName', requireAuth, requireRoles(TOP_ROLE), controller.revoke);

export { router as memberRoleRouter };
