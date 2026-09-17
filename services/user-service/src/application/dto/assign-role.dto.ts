import { IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  @MinLength(2)
  roleName!: string;

  /** Optional expiration for a temporary role grant. When set, the assignment stops being returned by listRoleNamesForUser/isAssigned once this timestamp passes — see UserRoleAssignmentRepository. Omit for a permanent grant. */
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
