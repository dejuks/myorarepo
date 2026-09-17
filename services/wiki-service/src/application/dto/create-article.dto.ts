import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
}
