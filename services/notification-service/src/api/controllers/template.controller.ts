import { Request, Response, NextFunction } from 'express';
import { TemplateService } from '@application/services/template.service';
import { CreateTemplateDto } from '@application/dto/create-template.dto';
import { UpdateTemplateDto } from '@application/dto/update-template.dto';

export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templates = await this.templateService.listTemplates();
      res.status(200).json({ success: true, data: templates });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request<unknown, unknown, CreateTemplateDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const template = await this.templateService.createTemplate(req.body);
      res.status(201).json({ success: true, data: template });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request<{ id: string }, unknown, UpdateTemplateDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const template = await this.templateService.updateTemplate(req.params.id, req.body);
      res.status(200).json({ success: true, data: template });
    } catch (err) {
      next(err);
    }
  };
}
