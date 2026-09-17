import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Editing an article always creates a new Revision — there is no in-place
 * update of existing content (see revision.entity.ts). Title changes
 * (page moves) aren't supported yet — Phase 2 territory, alongside the
 * other Administrator/Bureaucrat actions.
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
}
