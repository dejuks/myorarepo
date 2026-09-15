import { IUserRepository, ListUsersFilter, PaginatedResult } from '@domain/repositories/user.repository.interface';
import { IRoleRepository } from '@domain/repositories/role.repository.interface';
import { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';
import { User, UserStatus } from '@domain/entities/user.entity';
import { CreateUserDto } from '@application/dto/create-user.dto';
import { UpdateProfileDto } from '@application/dto/update-profile.dto';
import { ChangeStatusDto } from '@application/dto/change-status.dto';
import { ConflictError, NotFoundError, ValidationError } from '@common/errors/app-error';
import { rabbitMqPublisher } from '@infrastructure/messaging/rabbitmq.publisher';

export const DEFAULT_ROLE_NAME = 'USER';

export interface UserWithRoles extends User {
  roles: string[];
}

/**
 * UserService holds every use case for user profiles, roles, and account
 * lifecycle. Like auth-service's AuthService, it depends only on repository
 * INTERFACES so it is fully unit-testable with in-memory fakes.
 */
export class UserService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly roleRepo: IRoleRepository,
    private readonly userRoleRepo: IUserRoleAssignmentRepository,
  ) {}

  /**
   * Creates a new user profile. The caller (typically an orchestration
   * step at the gateway, or a registration flow) supplies the id — this
   * is the same UUID subsequently used to register credentials with
   * auth-service via POST /auth/register. Automatically assigns the
   * default USER role.
   */
  async createUser(dto: CreateUserDto): Promise<UserWithRoles> {
    const existingById = await this.userRepo.findById(dto.id);
    if (existingById) throw new ConflictError('A profile with this id already exists');

    const existingByEmail = await this.userRepo.findByEmail(dto.email);
    if (existingByEmail) throw new ConflictError('A profile with this email already exists');

    const user = await this.userRepo.create({
      id: dto.id,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      locale: dto.locale ?? 'en',
      status: UserStatus.PENDING,
    });

    const defaultRole = await this.roleRepo.findByName(DEFAULT_ROLE_NAME);
    if (defaultRole) {
      await this.userRoleRepo.assign(user.id, defaultRole.id, null);
    }

    await rabbitMqPublisher.publish('user.registered', { userId: user.id, email: user.email });

    return this.attachRoles(user);
  }

  async getById(id: string): Promise<UserWithRoles> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return this.attachRoles(user);
  }

  async getByEmail(email: string): Promise<UserWithRoles> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new NotFoundError('User not found');
    return this.attachRoles(user);
  }

  async listUsers(filter: ListUsersFilter): Promise<PaginatedResult<UserWithRoles>> {
    const result = await this.userRepo.list(filter);
    const items = await Promise.all(result.items.map((u) => this.attachRoles(u)));
    return { ...result, items };
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserWithRoles> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError('User not found');

    const updated = await this.userRepo.update(id, dto);
    await rabbitMqPublisher.publish('user.profile_updated', {
      userId: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      displayName: updated.displayName,
      avatarUrl: updated.avatarUrl,
    });

    return this.attachRoles(updated);
  }

  /**
   * Transitions account status. Business rule: only ACTIVE users can be
   * SUSPENDED, and only PENDING/ACTIVE users can be DEACTIVATED —
   * a DEACTIVATED account is a terminal state reached only through the
   * user's own request (self-service closure), never re-activated here.
   */
  async changeStatus(id: string, dto: ChangeStatusDto, actorUserId: string): Promise<UserWithRoles> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError('User not found');

    this.assertValidTransition(user.status, dto.status);

    const changes: Partial<User> = { status: dto.status };
    if (dto.status === UserStatus.DEACTIVATED) {
      changes.deactivatedAt = new Date();
    }

    const updated = await this.userRepo.update(id, changes);
    await rabbitMqPublisher.publish('user.status_changed', {
      userId: updated.id,
      status: updated.status,
      reason: dto.reason ?? null,
      changedBy: actorUserId,
    });

    return this.attachRoles(updated);
  }

  async assignRole(userId: string, roleName: string, actorUserId: string): Promise<UserWithRoles> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const role = await this.roleRepo.findByName(roleName);
    if (!role) throw new NotFoundError(`Role "${roleName}" does not exist`);

    await this.userRoleRepo.assign(userId, role.id, actorUserId);
    await rabbitMqPublisher.publish('user.role_assigned', { userId, role: role.name, assignedBy: actorUserId });

    return this.attachRoles(user);
  }

  async revokeRole(userId: string, roleName: string, actorUserId: string): Promise<UserWithRoles> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const role = await this.roleRepo.findByName(roleName);
    if (!role) throw new NotFoundError(`Role "${roleName}" does not exist`);

    if (role.name === DEFAULT_ROLE_NAME) {
      throw new ValidationError(`The default "${DEFAULT_ROLE_NAME}" role cannot be revoked`);
    }

    await this.userRoleRepo.revoke(userId, role.id);
    await rabbitMqPublisher.publish('user.role_revoked', { userId, role: role.name, revokedBy: actorUserId });

    return this.attachRoles(user);
  }

  // ---- private helpers ----------------------------------------------------

  private async attachRoles(user: User): Promise<UserWithRoles> {
    const roles = await this.userRoleRepo.listRoleNamesForUser(user.id);
    return { ...user, roles };
  }

  private assertValidTransition(from: UserStatus, to: UserStatus): void {
    const allowed: Record<UserStatus, UserStatus[]> = {
      [UserStatus.PENDING]: [UserStatus.ACTIVE, UserStatus.DEACTIVATED],
      [UserStatus.ACTIVE]: [UserStatus.SUSPENDED, UserStatus.DEACTIVATED],
      [UserStatus.SUSPENDED]: [UserStatus.ACTIVE, UserStatus.DEACTIVATED],
      [UserStatus.DEACTIVATED]: [],
    };

    if (from === to) return; // idempotent no-op
    if (!allowed[from].includes(to)) {
      throw new ValidationError(`Cannot transition user status from ${from} to ${to}`);
    }
  }
}
