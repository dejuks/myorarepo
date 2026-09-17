import { Request, Response, NextFunction } from 'express';
import { ArticleService } from '@application/services/article.service';
import { CreateArticleDto } from '@application/dto/create-article.dto';
import { UpdateArticleDto } from '@application/dto/update-article.dto';
import { ListArticlesQueryDto } from '@application/dto/list-articles-query.dto';
import { ListRevisionsQueryDto } from '@application/dto/list-revisions-query.dto';
import { AuthenticatedRequest } from '@api/middleware/auth.middleware';

export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  create = async (req: AuthenticatedRequest & Request<unknown, unknown, CreateArticleDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached create handler');
      const article = await this.articleService.createArticle(req.body, req.user.userId);
      res.status(201).json({ success: true, data: article });
    } catch (err) {
      next(err);
    }
  };

  getBySlug = async (req: Request<{ slug: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const article = await this.articleService.getArticleBySlug(req.params.slug);
      res.status(200).json({ success: true, data: article });
    } catch (err) {
      next(err);
    }
  };

  edit = async (req: AuthenticatedRequest & Request<{ slug: string }, unknown, UpdateArticleDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached edit handler');
      const article = await this.articleService.editArticle(req.params.slug, req.body, req.user.userId);
      res.status(200).json({ success: true, data: article });
    } catch (err) {
      next(err);
    }
  };

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = res.locals.query as ListArticlesQueryDto;
      const result = await this.articleService.listArticles({
        search: query.search,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
      });
      res.status(200).json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize } });
    } catch (err) {
      next(err);
    }
  };

  listRevisions = async (req: Request<{ slug: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = res.locals.query as ListRevisionsQueryDto;
      const result = await this.articleService.listRevisions(req.params.slug, query.page ?? 1, query.pageSize ?? 20);
      res.status(200).json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize } });
    } catch (err) {
      next(err);
    }
  };

  getRevision = async (req: Request<{ slug: string; revisionId: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const revision = await this.articleService.getRevision(req.params.slug, req.params.revisionId);
      res.status(200).json({ success: true, data: revision });
    } catch (err) {
      next(err);
    }
  };
}
