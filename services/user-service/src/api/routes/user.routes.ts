import { Router } from 'express';
import { UserController } from '@api/controllers/user.controller';
import { UserService } from '@application/services/user.service';
import { UserRepository } from '@infrastructure/repositories/user.repository';
import { RoleRepository } from '@infrastructure/repositories/role.repository';
import { UserRoleAssignmentRepository } from '@infrastructure/repositories/user-role-assignment.repository';
import { validateDto, validateQueryDto } from '@api/middleware/validate-dto.middleware';
import { requireAuth, requireRoles, requireSelfOrRoles } from '@api/middleware/auth.middleware';
import { CreateUserDto } from '@application/dto/create-user.dto';
import { UpdateProfileDto } from '@application/dto/update-profile.dto';
import { ChangeStatusDto } from '@application/dto/change-status.dto';
import { AssignRoleDto } from '@application/dto/assign-role.dto';
import { ListUsersQueryDto } from '@application/dto/list-users-query.dto';

const router = Router();

const userService = new UserService(new UserRepository(), new RoleRepository(), new UserRoleAssignmentRepository());
const controller = new UserController(userService);

const ADMIN = 'ADMIN';

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
 *     summary: List users (admin only), with pagination, status filter, and search
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated list of users }
 */
router.get('/users', requireAuth, requireRoles(ADMIN), validateQueryDto(ListUsersQueryDto), controller.list);

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
 *     summary: Update a profile (owner or admin only)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateProfileDto' }
 *     responses:
 *       200: { description: Profile updated }
 */
router.patch('/users/:id', requireAuth, requireSelfOrRoles('id', ADMIN), validateDto(UpdateProfileDto), controller.updateProfile);

/**
 * @openapi
 * /users/{id}/status:
 *   patch:
 *     summary: Change account status (self-deactivation, or admin-managed suspend/reactivate)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Status changed }
 *       400: { description: Invalid status transition }
 */
router.patch('/users/:id/status', requireAuth, requireSelfOrRoles('id', ADMIN), validateDto(ChangeStatusDto), controller.changeStatus);

/**
 * @openapi
 * /users/{id}/roles:
 *   post:
 *     summary: Assign a role to a user (admin only)
 *     tags: [Users, Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Role assigned }
 */
router.post('/users/:id/roles', requireAuth, requireRoles(ADMIN), validateDto(AssignRoleDto), controller.assignRole);

/**
 * @openapi
 * /users/{id}/roles/{roleName}:
 *   delete:
 *     summary: Revoke a role from a user (admin only)
 *     tags: [Users, Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Role revoked }
 */
router.delete('/users/:id/roles/:roleName', requireAuth, requireRoles(ADMIN), controller.revokeRole);

export { router as userRouter };
