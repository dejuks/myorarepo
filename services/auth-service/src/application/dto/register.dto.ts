import { IsEmail, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * @openapi
 * components:
 *   schemas:
 *     RegisterDto:
 *       type: object
 *       required: [userId, email, password]
 *       properties:
 *         userId: { type: string, format: uuid, description: "UUID pre-created by user-service" }
 *         email: { type: string, format: email }
 *         password: { type: string, format: password, minLength: 8 }
 */
export class RegisterDto {
  @IsUUID('4', { message: 'userId must be a valid UUID (created by user-service)' })
  userId!: string;

  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72, { message: 'Password must be at most 72 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/, {
    message: 'Password must contain uppercase, lowercase, a digit, and a special character',
  })
  password!: string;
}
