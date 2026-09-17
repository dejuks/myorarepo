import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, IsUrl, MaxLength, MinLength } from 'class-validator';

/**
 * Editing an article always creates a new Revision for `content` — there is
 * no in-place update of existing content (see revision.entity.ts). The
 * metadata fields below (summary/language/category/tags/featuredImageUrl)
 * are NOT versioned — they live directly on the Article row and are simply
 * overwritten, same as `title` would be if page-move existed. Title itself
 * still isn't editable in this phase.
 *
 * @openapi
 * components:
 *   schemas:
 *     UpdateArticleDto:
 *       type: object
 *       required: [content]
 *       properties:
 *         content: { type: string, description: 'Markdown' }
 *         editSummary: { type: string }
 *         summary: { type: string }
 *         language: { type: string }
 *         categoryId: { type: string, format: uuid }
 *         tagNames: { type: array, items: { type: string } }
 *         featuredImageUrl: { type: string }
 */
export class UpdateArticleDto {
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
