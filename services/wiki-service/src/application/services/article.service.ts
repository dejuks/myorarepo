import { Article, ArticleStatus } from '@domain/entities/article.entity';
import { Revision } from '@domain/entities/revision.entity';
import { ReviewDecision } from '@domain/entities/article-review.entity';
import { Tag } from '@domain/entities/tag.entity';
import { IArticleRepository, ListArticlesFilter, PaginatedResult } from '@domain/repositories/article.repository.interface';
import { IRevisionRepository } from '@domain/repositories/revision.repository.interface';
import { ITagRepository } from '@domain/repositories/tag.repository.interface';
import { IArticleReviewRepository } from '@domain/repositories/article-review.repository.interface';
import { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';
import { CreateArticleDto } from '@application/dto/create-article.dto';
import { UpdateArticleDto } from '@application/dto/update-article.dto';
import { ListArticlesQueryDto } from '@application/dto/list-articles-query.dto';
import { SubmitReviewDto } from '@application/dto/submit-review.dto';
import { ConflictError, ForbiddenError, NotFoundError } from '@common/errors/app-error';
import { slugify } from '@common/utils/slugify.util';

export interface ArticleWithContent extends Article {
  content: string;
  editSummary: string | null;
  revisionId: string;
  editorUserId: string;
  revisionCreatedAt: Date;
  tags: Tag[];
}

/** Who is asking — mirrors the JWT claims `requireAuth`/`optionalAuth` populate, without importing api/middleware into the application layer. */
export interface RequestingUser {
  userId: string;
  roles: string[];
}

// Mirrors auth.middleware.ts's PLATFORM_ADMIN_ROLE / module role names — duplicated as plain constants here
// (rather than imported) so the application layer doesn't depend on the api layer.
const PLATFORM_ADMIN_ROLE = 'ADMIN';
const MODERATOR_ROLES = ['ADMINISTRATOR', 'BUREAUCRAT'];

/** Valid status transitions — see Article's ArticleStatus doc comment for the full lifecycle diagram. */
const ALLOWED_TRANSITIONS: Record<ArticleStatus, ArticleStatus[]> = {
  [ArticleStatus.DRAFT]: [ArticleStatus.SUBMITTED],
  [ArticleStatus.SUBMITTED]: [ArticleStatus.UNDER_REVIEW],
  [ArticleStatus.UNDER_REVIEW]: [ArticleStatus.APPROVED, ArticleStatus.REJECTED, ArticleStatus.DRAFT],
  [ArticleStatus.APPROVED]: [ArticleStatus.PUBLISHED],
  [ArticleStatus.PUBLISHED]: [ArticleStatus.ARCHIVED],
  [ArticleStatus.ARCHIVED]: [],
  [ArticleStatus.REJECTED]: [ArticleStatus.SUBMITTED],
};

/**
 * Core content workflow: create an article (= its first revision), read its
 * current version, edit it (= a new revision), browse its edit history, and
 * — Phase 2 — carry it through the Draft -> ... -> Published review/approval
 * workflow (spec section "8. Review & Approval Workflow"). Content
 * creation/editing is gated at the route layer with `requireModuleRole`
 * (REGISTERED_EDITOR, ADMINISTRATOR, BUREAUCRAT or OVERSIGHTER, or the
 * platform ADMIN override) before ever reaching this service — a plain
 * authenticated account with no wiki role assignment cannot create or
 * edit articles; per the roles/responsibilities spec, being a Registered
 * Editor (or a higher role, which is a superset of it) is the actual bar.
 * Submitting for review is restricted to the article's own author (or a
 * moderator); the review/publish/archive actions themselves are gated the
 * same way with `requireModuleRole` (ADMINISTRATOR or BUREAUCRAT, or the
 * platform ADMIN override). Visibility follows real Wikipedia: the public
 * only ever sees PUBLISHED articles; an author always sees their own
 * regardless of status; a moderator sees everything (so they can find
 * work to review).
 */
export class ArticleService {
  constructor(
    private readonly articleRepo: IArticleRepository,
    private readonly revisionRepo: IRevisionRepository,
    private readonly tagRepo: ITagRepository,
    private readonly reviewRepo: IArticleReviewRepository,
    private readonly userRoleRepo: IUserRoleAssignmentRepository,
  ) {}

  async createArticle(dto: CreateArticleDto, authorUserId: string): Promise<ArticleWithContent> {
    const slug = await this.resolveUniqueSlug(dto.title);
    const language = dto.language ?? 'om';

    const article = await this.articleRepo.create({
      title: dto.title,
      slug,
      createdBy: authorUserId,
      summary: dto.summary ?? null,
      language,
      categoryId: dto.categoryId ?? null,
      featuredImageUrl: dto.featuredImageUrl ?? null,
    });
    const revision = await this.revisionRepo.create({
      articleId: article.id,
      content: dto.content,
      editSummary: dto.editSummary ?? null,
      editorUserId: authorUserId,
    });

    const tags = dto.tagNames?.length ? await this.applyTags(article.id, dto.tagNames, language) : [];

    return this.combine(article, revision, tags);
  }

  async getArticleBySlug(slug: string, viewer?: RequestingUser): Promise<ArticleWithContent> {
    const article = await this.articleRepo.findBySlug(slug);
    if (!article) throw new NotFoundError('Article not found');

    if (article.status !== ArticleStatus.PUBLISHED) {
      const isOwner = viewer?.userId === article.createdBy;
      if (!isOwner && !(await this.isModerator(viewer))) {
        // Don't distinguish "exists but hidden" from "doesn't exist" to an unauthorized caller.
        throw new NotFoundError('Article not found');
      }
    }

    const revision = await this.revisionRepo.findLatestForArticle(article.id);
    if (!revision) throw new NotFoundError('Article has no revisions'); // Defensive: creation always writes one.

    const tags = await this.tagRepo.findByIds(await this.articleRepo.listTagIdsForArticle(article.id));
    return this.combine(article, revision, tags);
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
    const metadata = {
      summary: dto.summary !== undefined ? dto.summary : article.summary,
      language: dto.language ?? article.language,
      categoryId: dto.categoryId !== undefined ? dto.categoryId : article.categoryId,
      featuredImageUrl: dto.featuredImageUrl !== undefined ? dto.featuredImageUrl : article.featuredImageUrl,
    };
    await this.articleRepo.touch(article.id, metadata);

    const tags = dto.tagNames
      ? await this.applyTags(article.id, dto.tagNames, metadata.language)
      : await this.tagRepo.findByIds(await this.articleRepo.listTagIdsForArticle(article.id));

    return this.combine({ ...article, ...metadata, updatedAt: new Date() }, revision, tags);
  }

  async listArticles(query: ListArticlesQueryDto, viewer?: RequestingUser): Promise<PaginatedResult<Article>> {
    const filter: ListArticlesFilter = {
      search: query.search,
      language: query.language,
      categoryId: query.categoryId,
      tagId: query.tagId,
      authorId: query.authorId,
      status: query.status,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    };

    if (!(await this.isModerator(viewer))) {
      filter.visibleStatuses = [ArticleStatus.PUBLISHED];
      filter.viewerUserId = viewer?.userId;
    }

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

  // ---- Review & Approval Workflow (spec section 8) ------------------------

  /** DRAFT/REJECTED -> SUBMITTED. Only the article's own author, or a moderator, may submit it. */
  async submitForReview(slug: string, requester: RequestingUser): Promise<ArticleWithContent> {
    const article = await this.requireArticle(slug);
    if (article.createdBy !== requester.userId && !(await this.isModerator(requester))) {
      throw new ForbiddenError('Only the article author or a moderator may submit it for review');
    }
    this.assertTransition(article.status, ArticleStatus.SUBMITTED);
    await this.articleRepo.setStatus(article.id, ArticleStatus.SUBMITTED);
    return this.getArticleBySlug(slug, requester);
  }

  /** SUBMITTED -> UNDER_REVIEW. Route-gated to moderators (requireModuleRole) before this is ever called. */
  async startReview(slug: string, reviewer: RequestingUser): Promise<ArticleWithContent> {
    const article = await this.requireArticle(slug);
    this.assertTransition(article.status, ArticleStatus.UNDER_REVIEW);
    await this.articleRepo.setStatus(article.id, ArticleStatus.UNDER_REVIEW);
    return this.getArticleBySlug(slug, reviewer);
  }

  /** UNDER_REVIEW -> APPROVED / REJECTED / DRAFT, and records the decision. Route-gated to moderators. */
  async review(slug: string, dto: SubmitReviewDto, reviewer: RequestingUser): Promise<ArticleWithContent> {
    const article = await this.requireArticle(slug);
    const nextStatus = this.statusForDecision(dto.decision);
    this.assertTransition(article.status, nextStatus);

    await this.reviewRepo.create({
      articleId: article.id,
      reviewerUserId: reviewer.userId,
      decision: dto.decision,
      comment: dto.comment ?? null,
    });
    await this.articleRepo.setStatus(article.id, nextStatus);
    return this.getArticleBySlug(slug, reviewer);
  }

  /** APPROVED -> PUBLISHED, stamping publishedAt. Route-gated to moderators. */
  async publish(slug: string, publisher: RequestingUser): Promise<ArticleWithContent> {
    const article = await this.requireArticle(slug);
    this.assertTransition(article.status, ArticleStatus.PUBLISHED);
    await this.articleRepo.setStatus(article.id, ArticleStatus.PUBLISHED, new Date());
    return this.getArticleBySlug(slug, publisher);
  }

  /** PUBLISHED -> ARCHIVED. Route-gated to moderators. */
  async archive(slug: string, archiver: RequestingUser): Promise<ArticleWithContent> {
    const article = await this.requireArticle(slug);
    this.assertTransition(article.status, ArticleStatus.ARCHIVED);
    await this.articleRepo.setStatus(article.id, ArticleStatus.ARCHIVED);
    return this.getArticleBySlug(slug, archiver);
  }

  async listReviews(slug: string) {
    const article = await this.requireArticle(slug);
    return this.reviewRepo.listForArticle(article.id);
  }

  // ---- private helpers ----------------------------------------------------

  private async requireArticle(slug: string): Promise<Article> {
    const article = await this.articleRepo.findBySlug(slug);
    if (!article) throw new NotFoundError('Article not found');
    return article;
  }

  private assertTransition(from: ArticleStatus, to: ArticleStatus): void {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
      throw new ConflictError(`Cannot move an article from ${from} to ${to}`);
    }
  }

  private statusForDecision(decision: ReviewDecision): ArticleStatus {
    switch (decision) {
      case ReviewDecision.APPROVE:
        return ArticleStatus.APPROVED;
      case ReviewDecision.REJECT:
        return ArticleStatus.REJECTED;
      case ReviewDecision.REQUEST_CHANGES:
        return ArticleStatus.DRAFT;
    }
  }

  private async isModerator(viewer?: RequestingUser): Promise<boolean> {
    if (!viewer) return false;
    if (viewer.roles.includes(PLATFORM_ADMIN_ROLE)) return true;
    const myRoles = await this.userRoleRepo.listRoleNamesForUser(viewer.userId);
    return myRoles.some((role) => MODERATOR_ROLES.includes(role));
  }

  private async applyTags(articleId: string, tagNames: string[], language: string): Promise<Tag[]> {
    const tags = await this.tagRepo.findOrCreateMany(tagNames, language);
    await this.articleRepo.setTags(articleId, tags.map((t) => t.id));
    return tags;
  }

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

  private combine(article: Article, revision: Revision, tags: Tag[]): ArticleWithContent {
    return {
      ...article,
      content: revision.content,
      editSummary: revision.editSummary,
      revisionId: revision.id,
      editorUserId: revision.editorUserId,
      revisionCreatedAt: revision.createdAt,
      tags,
    };
  }
}
