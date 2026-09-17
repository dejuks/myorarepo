import { ArticleService } from '@application/services/article.service';
import { FakeArticleRepository, FakeRevisionRepository } from './fakes';

describe('ArticleService', () => {
  let articleRepo: FakeArticleRepository;
  let revisionRepo: FakeRevisionRepository;
  let articleService: ArticleService;

  beforeEach(() => {
    articleRepo = new FakeArticleRepository();
    revisionRepo = new FakeRevisionRepository();
    articleService = new ArticleService(articleRepo, revisionRepo);
  });

  describe('createArticle', () => {
    it('creates an article and its first revision, and slugifies the title', async () => {
      const result = await articleService.createArticle(
        { title: 'Oromia Regional State', content: '# Oromia\n\nAn overview.' },
        'user-1',
      );

      expect(result.title).toBe('Oromia Regional State');
      expect(result.slug).toBe('oromia-regional-state');
      expect(result.content).toBe('# Oromia\n\nAn overview.');
      expect(result.editorUserId).toBe('user-1');
      expect(result.createdBy).toBe('user-1');
    });

    it('appends a numeric suffix when the slug already exists', async () => {
      await articleService.createArticle({ title: 'Finfinnee', content: 'v1' }, 'user-1');
      const second = await articleService.createArticle({ title: 'Finfinnee', content: 'v1' }, 'user-2');

      expect(second.slug).toBe('finfinnee-2');
    });

    it('rejects a title with no letters or digits (nothing to slugify)', async () => {
      await expect(articleService.createArticle({ title: '---', content: 'x' }, 'user-1')).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('getArticleBySlug', () => {
    it('returns the current (latest) revision content', async () => {
      const created = await articleService.createArticle({ title: 'Ateetee', content: 'v1' }, 'user-1');
      await articleService.editArticle(created.slug, { content: 'v2', editSummary: 'clarify' }, 'user-2');

      const fetched = await articleService.getArticleBySlug(created.slug);
      expect(fetched.content).toBe('v2');
      expect(fetched.editorUserId).toBe('user-2');
      expect(fetched.editSummary).toBe('clarify');
    });

    it('throws NotFoundError for an unknown slug', async () => {
      await expect(articleService.getArticleBySlug('does-not-exist')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('editArticle', () => {
    it('appends a new revision without altering earlier ones', async () => {
      const created = await articleService.createArticle({ title: 'Gadaa System', content: 'v1' }, 'user-1');
      await articleService.editArticle(created.slug, { content: 'v2' }, 'user-1');

      const history = await articleService.listRevisions(created.slug, 1, 20);
      expect(history.total).toBe(2);
      expect(history.items.map((r) => r.content).sort()).toEqual(['v1', 'v2']);
    });

    it('throws NotFoundError when editing a nonexistent article', async () => {
      await expect(articleService.editArticle('nonexistent', { content: 'x' }, 'user-1')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('listArticles', () => {
    it('filters by a case-insensitive title search', async () => {
      await articleService.createArticle({ title: 'Afaan Oromo', content: 'x' }, 'user-1');
      await articleService.createArticle({ title: 'Finfinnee', content: 'y' }, 'user-1');

      const result = await articleService.listArticles({ search: 'oromo', page: 1, pageSize: 20 });
      expect(result.total).toBe(1);
      expect(result.items[0].title).toBe('Afaan Oromo');
    });
  });

  describe('getRevision', () => {
    it('returns a specific historical revision by id', async () => {
      const created = await articleService.createArticle({ title: 'Waaqeffannaa', content: 'v1' }, 'user-1');
      const edited = await articleService.editArticle(created.slug, { content: 'v2' }, 'user-1');

      const firstRevision = (await articleService.listRevisions(created.slug, 1, 20)).items.find((r) => r.content === 'v1')!;
      const fetched = await articleService.getRevision(created.slug, firstRevision.id);
      expect(fetched.content).toBe('v1');
      expect(fetched.id).not.toBe(edited.revisionId);
    });

    it('throws NotFoundError for a revision id belonging to a different article', async () => {
      const first = await articleService.createArticle({ title: 'Article One', content: 'a' }, 'user-1');
      const second = await articleService.createArticle({ title: 'Article Two', content: 'b' }, 'user-1');

      await expect(articleService.getRevision(second.slug, first.revisionId)).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
