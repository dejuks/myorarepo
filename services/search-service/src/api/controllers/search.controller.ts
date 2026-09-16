import { Request, Response, NextFunction } from 'express';
import { SearchQueryService } from '@application/services/search-query.service';
import { SearchQueryDto } from '@application/dto/search-query.dto';

export class SearchController {
  constructor(private readonly queryService: SearchQueryService) {}

  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = res.locals.query as SearchQueryDto;
      const result = await this.queryService.search({
        query: query.q,
        entityType: query.type,
        sourceService: query.source,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      });
      res.status(200).json({
        success: true,
        data: result.items,
        meta: { total: result.total, page: result.page, pageSize: result.pageSize },
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doc = await this.queryService.findById(req.params.id);
      res.status(200).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  };
}
