import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewDecision } from '@domain/entities/article-review.entity';

/**
 * @openapi
 * components:
 *   schemas:
 *     SubmitReviewDto:
 *       type: object
 *       required: [decision]
 *       properties:
 *         decision: { type: string, enum: [APPROVE, REJECT, REQUEST_CHANGES] }
 *         comment: { type: string }
 */
export class SubmitReviewDto {
  @IsEnum(ReviewDecision)
  decision!: ReviewDecision;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
