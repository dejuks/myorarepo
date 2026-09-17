import { Article } from '@domain/entities/article.entity';
import { Revision } from '@domain/entities/revision.entity';
import { IArticleRepository, ListArticlesFilter, PaginatedResult } from '@domain/repositories/article.repository.interface';
import { IRevisionRepository } from '@domain/repositories/revision.repository.interface';
import { CreateArticleDto } from '@application/dto/create-article.dto';
import { UpdateArticleDto } from '@application/dto/update-article.dto';
import { ConflictError, NotFoundError } from '@common/errors/app-error';
import { slugify } from '@common/utils/slugify.util';

export interface ArticleWithContent extends Article {
  content: string;
  editSummary: string | null;
  revisionId: string;
  editorUserId: string;
  revisionCreatedAt: Date;
}

/**
 * Core content workflow for Phase 1: create an article (= its first
 * revision), read its current version, edit it (= a new revision), and
 * browse its edit history. No role/permission gate beyond `requireAuth` on
 * write endpoints — "Registered Editor" is treated as synonymous with "any
 * authenticated platform account", matching real Wikipedia (logging in is
 * the only bar to editing; there's no separate "become an editor" step).
 * Moderation-gated actions (delete/restore, protect, block — Administrator;
 * role promotion — Bureaucrat; suppression — Oversighter) are a later phase.
 */
export class ArticleService {
  constructor(
    private readonly articleRepo: IArticleRepository,
    private readonly revisionRepo: IRevisionRepository,
  ) {}

  async createArticle(dto: CreateArticleDto, authorUserId: string): Promise<ArticleWithContent> {
    const slug = await this.resolveUniqueSlug(dto.title);

    const article = await this.articleRepo.create({ title: dto.title, slug, createdBy: authorUserId });
    const revision = await this.revisionRepo.create({
      articleId: article.id,
      content: dto.content,
      editSummary: dto.editSummary ?? null,
      editorUserId: authorUserId,
    });

    return this.combine(article, revision);
  }

  async getArticleBySlug(slug: string): Promise<ArticleWithContent> {
    const article = await this.articleRepo.findBySlug(slug);
    if (!article) throw new NotFoundError('Article not found');

    const revision = await this.revisionRepo.findLatestForArticle(article.id);
    if (!revision) throw new NotFoundError('Article has no revisions'); // Defensive: creation always writes one.

    return this.combine(article, revision);
  }

  async editArticle(slug: string, dto: UpdateArticleDto, editorUserId: string): Promise<ArticleWithContent> {
    const article = await this.articleRepo.findBySlug(slug);
    if (!article) throw new NotFoundError('Article not found');

    const revision = await this.revisionRepo.create({
      articleId: article.id,
      content: dto.content,
      editSummary: dto.editSummary ?? null,
      editorUserId,
    });
    await this.articleRepo.touch(article.id);

    return this.combine(article, revision);
  }

  async listArticles(filter: ListArticlesFilter): Promise<PaginatedResult<Article>> {
    return this.articleRepo.list(filter);
  }

  async listRevisions(slug: string, page: number, pageSize: number): Promise<PaginatedResult<Revision>> {
    const article = await this.articleRepo.findBySlug(slug);
    if (!article) throw new NotFoundError('Article not found');
    return this.revisionRepo.listForArticle(article.id, page, pageSize);
  }

  async getRevision(slug: string, revisionId: string): Promise<Revision> {
    const article = await this.articleRepo.findBySlug(slug);
    if (!article) throw new NotFoundError('Article not found');

    const revision = await this.revisionRepo.findById(revisionId);
    if (!revision || revision.articleId !== article.id) throw new NotFoundError('Revision not found');
    return revision;
  }

  // ---- private helpers ----------------------------------------------------

  private async resolveUniqueSlug(title: string): Promise<string> {
    const base = slugify(title);
    if (!base) throw new ConflictError('Title must contain at least one letter or digit');

    let candidate = base;
    let suffix = 2;
    while (await this.articleRepo.slugExists(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private combine(article: Article, revision: Revision): ArticleWithContent {
    return {
      ...article,
      content: revision.content,
      editSummary: revision.editSummary,
      revisionId: revision.id,
      editorUserId: revision.editorUserId,
      revisionCreatedAt: revision.createdAt,
    };
  }
}
