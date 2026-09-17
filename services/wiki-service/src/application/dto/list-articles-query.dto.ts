import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ArticleStatus } from '@domain/entities/article.entity';

/** Query params behind spec section "11. Search Module" — full-text search plus the listed Advanced Search filters. */
export class ListArticlesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  tagId?: string;

  /** "Filter by Author" — a platform userId. */
  @IsOptional()
  @IsUUID()
  authorId?: string;

  /** Only meaningful for the requester themselves or a moderator — see ArticleService.listArticles' visibility rules. */
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  /** "Filter by Date" — inclusive range on createdAt. */
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
