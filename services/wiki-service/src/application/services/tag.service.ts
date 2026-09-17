import { Tag } from '@domain/entities/tag.entity';
import { ITagRepository } from '@domain/repositories/tag.repository.interface';
import { CreateTagDto } from '@application/dto/create-tag.dto';
import { ConflictError, NotFoundError } from '@common/errors/app-error';

/** Free-form article labels — spec section "5. Tags". See Tag entity's doc comment. */
export class TagService {
  constructor(private readonly tagRepo: ITagRepository) {}

  async listTags(language?: string): Promise<Tag[]> {
    return this.tagRepo.list(language);
  }

  async createTag(dto: CreateTagDto): Promise<Tag> {
    const language = dto.language ?? 'om';
    const existing = await this.tagRepo.findByName(dto.name, language);
    if (existing) throw new ConflictError(`Tag "${dto.name}" already exists for language "${language}"`);
    return this.tagRepo.create(dto.name, language, dto.description ?? null);
  }

  async deleteTag(id: string): Promise<void> {
    const tag = await this.tagRepo.findById(id);
    if (!tag) throw new NotFoundError('Tag not found');
    await this.tagRepo.delete(id);
  }
}
