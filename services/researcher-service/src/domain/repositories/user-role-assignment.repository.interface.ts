import { UserRoleAssignment } from '@domain/entities/user-role-assignment.entity';

export interface IUserRoleAssignmentRepository {
  assign(userId: string, roleId: string, assignedBy: string | null): Promise<UserRoleAssignment>;
  revoke(userId: string, roleId: string): Promise<void>;
  listRoleNamesForUser(userId: string): Promise<string[]>;
  isAssigned(userId: string, roleId: string): Promise<boolean>;
}
