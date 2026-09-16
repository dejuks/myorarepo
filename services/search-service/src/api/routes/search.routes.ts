import { Router } from 'express';
import { SearchController } from '@api/controllers/search.controller';
import { SearchQueryService } from '@application/services/search-query.service';
import { SearchDocumentRepository } from '@infrastructure/repositories/search-document.repository';
import { validateQueryDto } from '@api/middleware/validate-dto.middleware';
import { SearchQueryDto } from '@application/dto/search-query.dto';

const router = Router();
const queryService = new SearchQueryService(new SearchDocumentRepository());
const controller = new SearchController(queryService);

/**
 * @openapi
 * /search:
 *   get:
 *     summary: Full-text search across every indexed content type (public, no auth required)
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Free-text query, matched against title (weighted higher) and description.
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *         description: Filter by entityType, e.g. journal_article, ebook, wiki_article.
 *       - in: query
 *         name: source
 *         schema: { type: string }
 *         description: Filter by sourceService, e.g. journal-service.
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 50 }
 *     responses:
 *       200: { description: Paginated search results }
 */
router.get('/search', validateQueryDto(SearchQueryDto), controller.search);

/**
 * @openapi
 * /search/{id}:
 *   get:
 *     summary: Fetch a single indexed search document by its search_documents id
 *     tags: [Search]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The search document }
 *       404: { description: Not found }
 */
router.get('/search/:id', controller.getById);

export { router as searchRouter };
