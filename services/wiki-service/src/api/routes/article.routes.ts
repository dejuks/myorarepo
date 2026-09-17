import { Router } from 'express';
import { ArticleController } from '@api/controllers/article.controller';
import { ArticleService } from '@application/services/article.service';
import { ArticleRepository } from '@infrastructure/repositories/article.repository';
import { RevisionRepository } from '@infrastructure/repositories/revision.repository';
import { validateDto, validateQueryDto } from '@api/middleware/validate-dto.middleware';
import { requireAuth } from '@api/middleware/auth.middleware';
import { CreateArticleDto } from '@application/dto/create-article.dto';
import { UpdateArticleDto } from '@application/dto/update-article.dto';
import { ListArticlesQueryDto } from '@application/dto/list-articles-query.dto';
import { ListRevisionsQueryDto } from '@application/dto/list-revisions-query.dto';

const router = Router();
const articleService = new ArticleService(new ArticleRepository(), new RevisionRepository());
const controller = new ArticleController(articleService);

/**
 * Reads are public (no requireAuth) — same as real Wikipedia, and matches
 * this module's gateway route already being marked `requiresAuth: false`
 * (see services/gateway/src/config/service-registry.ts). Writes require a
 * valid platform account — see ArticleService's doc comment for why that's
 * the only gate in Phase 1 (no separate "Registered Editor" grant needed).
 */

/**
 * @openapi
 * /articles:
 *   get:
 *     summary: List articles (public), paginated, optional title search
 *     tags: [Articles]
 *     responses:
 *       200: { description: Paginated list of articles }
 */
router.get('/articles', validateQueryDto(ListArticlesQueryDto), controller.list);

/**
 * @openapi
 * /articles:
 *   post:
 *     summary: Create a new article (any authenticated account)
 *     tags: [Articles]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateArticleDto' }
 *     responses:
 *       201: { description: Article created }
 */
router.post('/articles', requireAuth, validateDto(CreateArticleDto), controller.create);

/**
 * @openapi
 * /articles/{slug}:
 *   get:
 *     summary: Get an article's current version (public)
 *     tags: [Articles]
 *     responses:
 *       200: { description: Article returned }
 *       404: { description: Not found }
 */
router.get('/articles/:slug', controller.getBySlug);

/**
 * @openapi
 * /articles/{slug}:
 *   put:
 *     summary: Edit an article (saves a new revision; any authenticated account)
 *     tags: [Articles]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateArticleDto' }
 *     responses:
 *       200: { description: New revision saved }
 *       404: { description: Not found }
 */
router.put('/articles/:slug', requireAuth, validateDto(UpdateArticleDto), controller.edit);

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

export { router as articleRouter };
