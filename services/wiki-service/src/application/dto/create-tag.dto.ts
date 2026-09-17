import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateTagDto:
 *       type: object
 *       required: [name]
 *       properties:
 *         name: { type: string }
 *         description: { type: string }
 *         language: { type: string, description: "ISO code, defaults to 'om'" }
 */
export class CreateTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;
}
