import { Router } from 'express';
import { ArticleController } from '@api/controllers/article.controller';
import { ArticleService } from '@application/services/article.service';
import { ArticleRepository } from '@infrastructure/repositories/article.repository';
import { RevisionRepository } from '@infrastructure/repositories/revision.repository';
import { TagRepository } from '@infrastructure/repositories/tag.repository';
import { ArticleReviewRepository } from '@infrastructure/repositories/article-review.repository';
import { UserRoleAssignmentRepository } from '@infrastructure/repositories/user-role-assignment.repository';
import { validateDto, validateQueryDto } from '@api/middleware/validate-dto.middleware';
import { optionalAuth, requireAuth, requireModuleRole } from '@api/middleware/auth.middleware';
import { CreateArticleDto } from '@application/dto/create-article.dto';
import { UpdateArticleDto } from '@application/dto/update-article.dto';
import { ListArticlesQueryDto } from '@application/dto/list-articles-query.dto';
import { ListRevisionsQueryDto } from '@application/dto/list-revisions-query.dto';
import { SubmitReviewDto } from '@application/dto/submit-review.dto';

const router = Router();
const userRoleRepo = new UserRoleAssignmentRepository();
const articleService = new ArticleService(
  new ArticleRepository(),
  new RevisionRepository(),
  new TagRepository(),
  new ArticleReviewRepository(),
  userRoleRepo,
);
const controller = new ArticleController(articleService);

/** Moderator gate for review/publish/archive — ADMINISTRATOR or BUREAUCRAT, live-checked against wiki_db (or the platform ADMIN override). See requireModuleRole's doc comment for why this replaces requireRoles here. */
const requireModerator = requireModuleRole(userRoleRepo, 'ADMINISTRATOR', 'BUREAUCRAT');

/**
 * Editor gate for create/edit — any wiki role at all (REGISTERED_EDITOR,
 * ADMINISTRATOR, BUREAUCRAT or OVERSIGHTER), live-checked against wiki_db
 * (or the platform ADMIN override, via requireModuleRole). A plain
 * authenticated account with no wiki role assignment is blocked from
 * writing content — see the roles/responsibilities spec: only a
 * Registered Editor (or a higher role, which is a superset of it) may
 * create or edit articles.
 */
const requireEditor = requireModuleRole(userRoleRepo, 'REGISTERED_EDITOR', 'ADMINISTRATOR', 'BUREAUCRAT', 'OVERSIGHTER');

/**
 * Reads use `optionalAuth` (not `requireAuth`) so they stay public while
 * still knowing who's asking — an author needs to see their own
 * unpublished drafts, and a moderator needs to see everything pending
 * review. Writes require a valid platform account AND at least the
 * REGISTERED_EDITOR wiki role (see `requireEditor` above) — creating or
 * editing an article is not open to every logged-in user, unlike real
 * Wikipedia's "logging in is the only bar to editing" model. The
 * review/publish/archive actions below layer a further moderator-only
 * gate on top of that.
 */

/**
 * @openapi
 * /articles:
 *   get:
 *     summary: List articles, paginated — public sees only PUBLISHED, the author also sees their own, a moderator sees everything
 *     tags: [Articles]
 *     responses:
 *       200: { description: Paginated list of articles }
 */
router.get('/articles', optionalAuth, validateQueryDto(ListArticlesQueryDto), controller.list);

/**
 * @openapi
 * /articles:
 *   post:
 *     summary: Create a new article (requires at least the REGISTERED_EDITOR wiki role, or platform ADMIN)
 *     tags: [Articles]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateArticleDto' }
 *     responses:
 *       201: { description: Article created }
 *       403: { description: Authenticated, but holds no wiki role }
 */
router.post('/articles', requireAuth, requireEditor, validateDto(CreateArticleDto), controller.create);

/**
 * @openapi
 * /articles/{slug}:
 *   get:
 *     summary: Get an article's current version — public if PUBLISHED, otherwise only its author or a moderator
 *     tags: [Articles]
 *     responses:
 *       200: { description: Article returned }
 *       404: { description: Not found (or hidden from this caller) }
 */
router.get('/articles/:slug', optionalAuth, controller.getBySlug);

/**
 * @openapi
 * /articles/{slug}:
 *   put:
 *     summary: Edit an article (saves a new revision; requires at least the REGISTERED_EDITOR wiki role, or platform ADMIN)
 *     tags: [Articles]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateArticleDto' }
 *     responses:
 *       200: { description: New revision saved }
 *       403: { description: Authenticated, but holds no wiki role }
 *       404: { description: Not found }
 */
router.put('/articles/:slug', requireAuth, requireEditor, validateDto(UpdateArticleDto), controller.edit);

/**
 * @openapi
 * /articles/{slug}/revisions:
 *   get:
 *     summary: List an article's edit history (public), newest first
 *     tags: [Articles, Revisions]
 *     responses:
 *       200: { description: Paginated revision list }
 */
router.get('/articles/:slug/revisions', validateQueryDto(ListRevisionsQueryDto), controller.listRevisions);

/**
 * @openapi
 * /articles/{slug}/revisions/{revisionId}:
 *   get:
 *     summary: Get one historical revision's full content (public)
 *     tags: [Articles, Revisions]
 *     responses:
 *       200: { description: Revision returned }
 *       404: { description: Not found }
 */
router.get('/articles/:slug/revisions/:revisionId', controller.getRevision);

/**
 * @openapi
 * /articles/{slug}/submit:
 *   post:
 *     summary: Submit a DRAFT (or REJECTED) article for review — the author or a moderator only
 *     tags: [Articles, Review]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Article moved to SUBMITTED }
 *       403: { description: Not the author, and not a moderator }
 *       409: { description: Article isn't in a state that can be submitted }
 */
router.post('/articles/:slug/submit', requireAuth, controller.submit);

/**
 * @openapi
 * /articles/{slug}/review/start:
 *   post:
 *     summary: A moderator picks up a SUBMITTED article (moves it to UNDER_REVIEW)
 *     tags: [Articles, Review]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Article moved to UNDER_REVIEW }
 *       403: { description: Not a moderator }
 */
router.post('/articles/:slug/review/start', requireAuth, requireModerator, controller.startReview);

/**
 * @openapi
 * /articles/{slug}/review:
 *   post:
 *     summary: Record a reviewer decision on an UNDER_REVIEW article (Approve / Reject / Request Changes)
 *     tags: [Articles, Review]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SubmitReviewDto' }
 *     responses:
 *       200: { description: Decision recorded, article status updated }
 *       403: { description: Not a moderator }
 */
router.post('/articles/:slug/review', requireAuth, requireModerator, validateDto(SubmitReviewDto), controller.review);

/**
 * @openapi
 * /articles/{slug}/publish:
 *   post:
 *     summary: Publish an APPROVED article
 *     tags: [Articles, Review]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Article moved to PUBLISHED }
 *       403: { description: Not a moderator }
 */
router.post('/articles/:slug/publish', requireAuth, requireModerator, controller.publish);

/**
 * @openapi
 * /articles/{slug}/archive:
 *   post:
 *     summary: Archive a PUBLISHED article
 *     tags: [Articles, Review]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Article moved to ARCHIVED }
 *       403: { description: Not a moderator }
 */
router.post('/articles/:slug/archive', requireAuth, requireModerator, controller.archive);

/**
 * @openapi
 * /articles/{slug}/reviews:
 *   get:
 *     summary: List an article's review decision history (any authenticated account)
 *     tags: [Articles, Review]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Review history returned }
 */
router.get('/articles/:slug/reviews', requireAuth, controller.listReviews);

export { router as articleRouter };
