import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class SetRolePermissionsDto {
  /** Full replacement set of permission keys for the role — not a diff/patch. */
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionKeys!: string[];
}
