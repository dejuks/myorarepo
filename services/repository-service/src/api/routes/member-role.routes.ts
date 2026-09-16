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

/** This module's TOP_ROLE — the only role allowed to assign/revoke roles for other members. */
const TOP_ROLE = 'REPOSITORY_ADMINISTRATOR';

/**
 * @openapi
 * /repository/members/{userId}/roles:
 *   get:
 *     summary: List a member's roles in this module (self or REPOSITORY_ADMINISTRATOR)
 *     tags: [Members, Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Member roles returned }
 */
router.get('/repository/members/:userId/roles', requireAuth, requireSelfOrRoles('userId', TOP_ROLE), controller.list);

/**
 * @openapi
 * /repository/members/{userId}/roles:
 *   post:
 *     summary: Assign a role to a member (REPOSITORY_ADMINISTRATOR only)
 *     tags: [Members, Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Role assigned }
 *       404: { description: Role does not exist }
 */
router.post('/repository/members/:userId/roles', requireAuth, requireRoles(TOP_ROLE), validateDto(AssignRoleDto), controller.assign);

/**
 * @openapi
 * /repository/members/{userId}/roles/{roleName}:
 *   delete:
 *     summary: Revoke a role from a member (REPOSITORY_ADMINISTRATOR only)
 *     tags: [Members, Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Role revoked }
 *       404: { description: Role does not exist }
 */
router.delete('/repository/members/:userId/roles/:roleName', requireAuth, requireRoles(TOP_ROLE), controller.revoke);

export { router as memberRoleRouter };
