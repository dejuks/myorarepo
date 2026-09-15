import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NotificationChannel } from '@domain/entities/notification.entity';

export class CreateTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  code!: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsString()
  @MinLength(1)
  bodyTemplate!: string;
}
