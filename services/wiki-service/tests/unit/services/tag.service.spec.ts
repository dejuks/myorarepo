import { TagService } from '@application/services/tag.service';
import { FakeTagRepository } from './fakes';
import { v4 as uuidv4 } from 'uuid';

describe('TagService', () => {
  let repo: FakeTagRepository;
  let service: TagService;

  beforeEach(() => {
    repo = new FakeTagRepository();
    service = new TagService(repo);
  });

  it('creates a tag defaulting to the "om" language', async () => {
    const tag = await service.createTag({ name: 'history' });
    expect(tag.language).toBe('om');
  });

  it('rejects creating a duplicate tag name within the same language', async () => {
    await service.createTag({ name: 'culture' });
    await expect(service.createTag({ name: 'culture' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('allows the same tag name in two different languages', async () => {
    await service.createTag({ name: 'culture', language: 'om' });
    const enTag = await service.createTag({ name: 'culture', language: 'en' });
    expect(enTag.language).toBe('en');
  });

  it('deletes an existing tag', async () => {
    const tag = await service.createTag({ name: 'festival' });
    await service.deleteTag(tag.id);
    expect(await repo.findById(tag.id)).toBeNull();
  });

  it('throws NotFoundError deleting an unknown tag', async () => {
    await expect(service.deleteTag(uuidv4())).rejects.toMatchObject({ statusCode: 404 });
  });
});
