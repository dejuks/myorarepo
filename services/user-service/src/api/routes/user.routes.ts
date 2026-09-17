import { Router } from 'express';
import { UserController } from '@api/controllers/user.controller';
import { UserService } from '@application/services/user.service';
import { PermissionService } from '@application/services/permission.service';
import { UserRepository } from '@infrastructure/repositories/user.repository';
import { RoleRepository } from '@infrastructure/repositories/role.repository';
import { UserRoleAssignmentRepository } from '@infrastructure/repositories/user-role-assignment.repository';
import { PermissionRepository } from '@infrastructure/repositories/permission.repository';
import { RolePermissionRepository } from '@infrastructure/repositories/role-permission.repository';
import { validateDto, validateQueryDto } from '@api/middleware/validate-dto.middleware';
import { requireAuth } from '@api/middleware/auth.middleware';
import { requirePermission, requireSelfOrPermission } from '@api/middleware/permission.middleware';
import { CreateUserDto } from '@application/dto/create-user.dto';
import { UpdateProfileDto } from '@application/dto/update-profile.dto';
import { ChangeStatusDto } from '@application/dto/change-status.dto';
import { AssignRoleDto } from '@application/dto/assign-role.dto';
import { ListUsersQueryDto } from '@application/dto/list-users-query.dto';

const router = Router();

const roleRepo = new RoleRepository();
const userRoleRepo = new UserRoleAssignmentRepository();
const permissionRepo = new PermissionRepository();
const rolePermissionRepo = new RolePermissionRepository();

const userService = new UserService(new UserRepository(), roleRepo, userRoleRepo);
const permissionService = new PermissionService(permissionRepo, rolePermissionRepo, roleRepo, userRoleRepo);
const controller = new UserController(userService);

/**
 * Real, server-side, permission-based enforcement (not blanket "is ADMIN").
 * Each middleware call below does a live database lookup of the caller's
 * current role(s) and those roles' current permissions — see
 * PermissionService.userHasPermission — so granting/revoking a permission
 * on a role, or assigning/revoking a role on a user, takes effect on the
 * very next request with no re-login required.
 */
const VIEW_USERS = 'users.view';
const MANAGE_USERS = 'users.manage';
const ASSIGN_ROLES = 'roles.assign';

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create a user profile (id is the platform-wide UUID also used to register auth-service credentials)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateUserDto' }
 *     responses:
 *       201: { description: Profile created, default USER role assigned }
 *       409: { description: A profile with this id or email already exists }
 */
router.post('/users', validateDto(CreateUserDto), controller.create);

/**
 * @openapi
 * /users/me:
 *   get:
 *     summary: Get the authenticated user's own profile
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile returned }
 */
router.get('/users/me', requireAuth, controller.getMe);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List users (requires users.view), with pagination, status filter, and search
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated list of users }
 */
router.get('/users', requireAuth, requirePermission(permissionService, VIEW_USERS), validateQueryDto(ListUsersQueryDto), controller.list);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get a user profile by id
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile returned }
 *       404: { description: Not found }
 */
router.get('/users/:id', requireAuth, controller.getById);

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     summary: Update a profile (owner, or requires users.manage)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateProfileDto' }
 *     responses:
 *       200: { description: Profile updated }
 */
router.patch(
  '/users/:id',
  requireAuth,
  requireSelfOrPermission(permissionService, 'id', MANAGE_USERS),
  validateDto(UpdateProfileDto),
  controller.updateProfile,
);

/**
 * @openapi
 * /users/{id}/status:
 *   patch:
 *     summary: Change account status (self-deactivation, or requires users.manage for admin-managed suspend/reactivate)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Status changed }
 *       400: { description: Invalid status transition }
 */
router.patch(
  '/users/:id/status',
  requireAuth,
  requireSelfOrPermission(permissionService, 'id', MANAGE_USERS),
  validateDto(ChangeStatusDto),
  controller.changeStatus,
);

/**
 * @openapi
 * /users/{id}/roles:
 *   post:
 *     summary: Assign a role to a user (requires roles.assign)
 *     tags: [Users, Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Role assigned }
 */
router.post(
  '/users/:id/roles',
  requireAuth,
  requirePermission(permissionService, ASSIGN_ROLES),
  validateDto(AssignRoleDto),
  controller.assignRole,
);

/**
 * @openapi
 * /users/{id}/roles/{roleName}:
 *   delete:
 *     summary: Revoke a role from a user (requires roles.assign)
 *     tags: [Users, Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Role revoked }
 */
router.delete('/users/:id/roles/:roleName', requireAuth, requirePermission(permissionService, ASSIGN_ROLES), controller.revokeRole);

export { router as userRouter };
