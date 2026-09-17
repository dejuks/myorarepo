import { IsDateString, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { Gender } from '@domain/entities/user.entity';

/**
 * @openapi
 * components:
 *   schemas:
 *     UpdateProfileDto:
 *       type: object
 *       properties:
 *         firstName: { type: string }
 *         lastName: { type: string }
 *         displayName: { type: string }
 *         avatarUrl: { type: string, format: uri }
 *         bio: { type: string }
 *         phone: { type: string }
 *         locale: { type: string }
 *         gender: { type: string, enum: [MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY] }
 *         dateOfBirth: { type: string, format: date }
 *         address: { type: string }
 *         country: { type: string }
 *         region: { type: string }
 *         city: { type: string }
 *         timezone: { type: string }
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  displayName?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  /** ISO 8601 date, e.g. "1990-05-17" — stored as a DATE column, no time component. */
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  /** IANA timezone name, e.g. "Africa/Addis_Ababa". Not validated against the tz database here — the frontend offers a fixed list. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
}
