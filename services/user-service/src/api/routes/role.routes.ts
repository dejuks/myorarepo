import { Router } from 'express';
import { RoleController } from '@api/controllers/role.controller';
import { PermissionController } from '@api/controllers/permission.controller';
import { RoleService } from '@application/services/role.service';
import { PermissionService } from '@application/services/permission.service';
import { RoleRepository } from '@infrastructure/repositories/role.repository';
import { PermissionRepository } from '@infrastructure/repositories/permission.repository';
import { RolePermissionRepository } from '@infrastructure/repositories/role-permission.repository';
import { UserRoleAssignmentRepository } from '@infrastructure/repositories/user-role-assignment.repository';
import { validateDto } from '@api/middleware/validate-dto.middleware';
import { requireAuth } from '@api/middleware/auth.middleware';
import { requirePermission } from '@api/middleware/permission.middleware';
import { CreateRoleDto } from '@application/dto/create-role.dto';
import { SetRolePermissionsDto } from '@application/dto/set-role-permissions.dto';

const router = Router();
const roleRepo = new RoleRepository();
const permissionRepo = new PermissionRepository();
const rolePermissionRepo = new RolePermissionRepository();
const userRoleRepo = new UserRoleAssignmentRepository();

const roleService = new RoleService(roleRepo);
const permissionService = new PermissionService(permissionRepo, rolePermissionRepo, roleRepo, userRoleRepo);
const controller = new RoleController(roleService);
const permissionController = new PermissionController(permissionService);

/** Gates everything about the role catalog beyond read-only listing: creating/deleting roles and editing a role's permission set. */
const MANAGE_ROLES = 'roles.manage_catalog';

/**
 * @openapi
 * /roles:
 *   get:
 *     summary: List the platform's role catalog
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
 *     summary: Create a custom role (requires roles.manage_catalog)
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Role created }
 *       409: { description: Role name already exists }
 */
router.post('/roles', requireAuth, requirePermission(permissionService, MANAGE_ROLES), validateDto(CreateRoleDto), controller.create);

/**
 * @openapi
 * /roles/{id}:
 *   delete:
 *     summary: Delete a custom role (requires roles.manage_catalog; system roles are protected)
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Role deleted }
 *       400: { description: Cannot delete a system role }
 */
router.delete('/roles/:id', requireAuth, requirePermission(permissionService, MANAGE_ROLES), controller.delete);

/**
 * @openapi
 * /permissions:
 *   get:
 *     summary: List the platform's fixed permission catalog, grouped by category (requires roles.manage_catalog)
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Permissions returned }
 */
router.get('/permissions', requireAuth, requirePermission(permissionService, MANAGE_ROLES), permissionController.list);

/**
 * @openapi
 * /roles/{id}/permissions:
 *   get:
 *     summary: Get the permission keys a role currently grants (requires roles.manage_catalog)
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Role's current permission keys returned }
 *       404: { description: Role not found }
 */
router.get('/roles/:id/permissions', requireAuth, requirePermission(permissionService, MANAGE_ROLES), permissionController.getForRole);

/**
 * @openapi
 * /roles/{id}/permissions:
 *   put:
 *     summary: Replace a role's permission set (requires roles.manage_catalog). Applies live — no re-login required for affected users.
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Role's permission set updated }
 *       400: { description: Unknown permission key(s) }
 *       404: { description: Role not found }
 */
router.put(
  '/roles/:id/permissions',
  requireAuth,
  requirePermission(permissionService, MANAGE_ROLES),
  validateDto(SetRolePermissionsDto),
  permissionController.setForRole,
);

export { router as roleRouter };
