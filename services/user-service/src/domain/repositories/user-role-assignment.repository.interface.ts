import { UserRoleAssignment } from '@domain/entities/user-role-assignment.entity';

export interface IUserRoleAssignmentRepository {
  /** `expiresAt` is optional/undefined (or null) for a permanent grant. */
  assign(userId: string, roleId: string, assignedBy: string | null, expiresAt?: Date | null): Promise<UserRoleAssignment>;
  revoke(userId: string, roleId: string): Promise<void>;
  /** Excludes rows whose expiresAt is in the past — an expired role grant is treated as if it were revoked. */
  listRoleNamesForUser(userId: string): Promise<string[]>;
  /** Excludes expired rows, same as listRoleNamesForUser. */
  isAssigned(userId: string, roleId: string): Promise<boolean>;
}
