import { INotificationTemplateRepository } from '@domain/repositories/notification-template.repository.interface';
import { NotificationTemplate } from '@domain/entities/notification-template.entity';
import { CreateTemplateDto } from '@application/dto/create-template.dto';
import { UpdateTemplateDto } from '@application/dto/update-template.dto';
import { ConflictError, NotFoundError } from '@common/errors/app-error';

export class TemplateService {
  constructor(private readonly templateRepo: INotificationTemplateRepository) {}

  async listTemplates(): Promise<NotificationTemplate[]> {
    return this.templateRepo.listAll();
  }

  async createTemplate(dto: CreateTemplateDto): Promise<NotificationTemplate> {
    const existing = await this.templateRepo.findByCodeAndChannel(dto.code, dto.channel);
    if (existing) throw new ConflictError(`A template for ${dto.code}/${dto.channel} already exists`);

    return this.templateRepo.create({
      code: dto.code,
      channel: dto.channel,
      subject: dto.subject ?? null,
      bodyTemplate: dto.bodyTemplate,
      isActive: true,
    });
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto): Promise<NotificationTemplate> {
    const existing = await this.templateRepo.findById(id);
    if (!existing) throw new NotFoundError('Template not found');

    return this.templateRepo.update(id, dto);
  }
}
