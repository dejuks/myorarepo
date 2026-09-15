import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateUserDto:
 *       type: object
 *       required: [id, email, firstName, lastName]
 *       properties:
 *         id: { type: string, format: uuid, description: "Pre-generated UUID also used when registering credentials with auth-service" }
 *         email: { type: string, format: email }
 *         firstName: { type: string }
 *         lastName: { type: string }
 */
export class CreateUserDto {
  @IsUUID('4')
  id!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;
}
