import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateCategoryDto:
 *       type: object
 *       required: [name]
 *       properties:
 *         name: { type: string }
 *         description: { type: string }
 *         parentCategoryId: { type: string, format: uuid }
 *         language: { type: string, description: "ISO code, defaults to 'om'" }
 */
export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUUID()
  parentCategoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;
}
