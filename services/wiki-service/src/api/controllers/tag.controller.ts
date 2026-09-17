import { Request, Response, NextFunction } from 'express';
import { TagService } from '@application/services/tag.service';
import { CreateTagDto } from '@application/dto/create-tag.dto';

export class TagController {
  constructor(private readonly tagService: TagService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const language = typeof req.query.language === 'string' ? req.query.language : undefined;
      const tags = await this.tagService.listTags(language);
      res.status(200).json({ success: true, data: tags });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request<unknown, unknown, CreateTagDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tag = await this.tagService.createTag(req.body);
      res.status(201).json({ success: true, data: tag });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.tagService.deleteTag(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
