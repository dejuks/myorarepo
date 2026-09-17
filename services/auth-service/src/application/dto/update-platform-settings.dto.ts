import { IsBoolean } from 'class-validator';

export class UpdatePlatformSettingsDto {
  @IsBoolean({ message: 'requireEmailVerification must be true or false' })
  requireEmailVerification!: boolean;
}
