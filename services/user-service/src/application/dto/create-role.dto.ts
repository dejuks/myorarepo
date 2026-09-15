import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Za-z_]+$/, { message: 'Role name must contain only letters and underscores' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
