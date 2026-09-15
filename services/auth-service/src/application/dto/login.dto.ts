import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * @openapi
 * components:
 *   schemas:
 *     LoginDto:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email: { type: string, format: email }
 *         password: { type: string, format: password }
 *         mfaCode: { type: string, description: "6-digit TOTP code, required only if MFA is enabled" }
 */
export class LoginDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  mfaCode?: string;
}
