import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, IsUrl, MaxLength, MinLength } from 'class-validator';

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateArticleDto:
 *       type: object
 *       required: [title, content]
 *       properties:
 *         title: { type: string }
 *         content: { type: string, description: 'Markdown' }
 *         editSummary: { type: string }
 *         summary: { type: string }
 *         language: { type: string, description: "ISO code, defaults to 'om'" }
 *         categoryId: { type: string, format: uuid }
 *         tagNames: { type: array, items: { type: string } }
 *         featuredImageUrl: { type: string }
 */
export class CreateArticleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  editSummary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tagNames?: string[];

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  featuredImageUrl?: string;
}
