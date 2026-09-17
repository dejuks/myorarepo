import { ArticleService, RequestingUser } from '@application/services/article.service';
import { ReviewDecision } from '@domain/entities/article-review.entity';
import {
  FakeArticleRepository,
  FakeArticleReviewRepository,
  FakeRevisionRepository,
  FakeRoleRepository,
  FakeTagRepository,
  FakeUserRoleAssignmentRepository,
} from './fakes';

describe('ArticleService', () => {
  let articleRepo: FakeArticleRepository;
  let revisionRepo: FakeRevisionRepository;
  let tagRepo: FakeTagRepository;
  let reviewRepo: FakeArticleReviewRepository;
  let roleRepo: FakeRoleRepository;
  let userRoleRepo: FakeUserRoleAssignmentRepository;
  let articleService: ArticleService;

  async function moderator(userId: string): Promise<RequestingUser> {
    const role = await roleRepo.findByName('BUREAUCRAT');
    await userRoleRepo.assign(userId, role!.id, null);
    return { userId, roles: [] };
  }

  function viewer(userId: string): RequestingUser {
    return { userId, roles: [] };
  }

  beforeEach(() => {
    articleRepo = new FakeArticleRepository();
    revisionRepo = new FakeRevisionRepository();
    tagRepo = new FakeTagRepository();
    reviewRepo = new FakeArticleReviewRepository();
    roleRepo = new FakeRoleRepository();
    roleRepo.seed(['REGISTERED_EDITOR', 'ADMINISTRATOR', 'BUREAUCRAT', 'OVERSIGHTER']);
    userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);
    articleService = new ArticleService(articleRepo, revisionRepo, tagRepo, reviewRepo, userRoleRepo);
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
      expect(result.status).toBe('DRAFT');
    });

    it('appends a numeric suffix when the slug already exists', async () => {
      await articleService.createArticle({ title: 'Finfinnee', content: 'v1' }, 'user-1');
      const second = await articleService.createArticle({ title: 'Finfinnee', content: 'v1' }, 'user-2');

      expect(second.slug).toBe('finfinnee-2');
    });

    it('rejects a title with no letters or digits (nothing to slugify)', async () => {
      await expect(articleService.createArticle({ title: '---', content: 'x' }, 'user-1')).rejects.toMatchObject({ statusCode: 409 });
    });

    it('creates any tag names that do not already exist and links them to the article', async () => {
      const result = await articleService.createArticle(
        { title: 'Irreecha', content: 'x', tagNames: ['festival', 'Festival', 'culture'] },
        'user-1',
      );

      expect(result.tags.map((t) => t.name).sort()).toEqual(['culture', 'festival']);
      expect((await tagRepo.list()).length).toBe(2); // "festival" and "Festival" dedupe to one
    });
  });

  describe('getArticleBySlug', () => {
    it('returns the current (latest) revision content to the author', async () => {
      const created = await articleService.createArticle({ title: 'Ateetee', content: 'v1' }, 'user-1');
      await articleService.editArticle(created.slug, { content: 'v2', editSummary: 'clarify' }, 'user-2');

      const fetched = await articleService.getArticleBySlug(created.slug, viewer('user-1'));
      expect(fetched.content).toBe('v2');
      expect(fetched.editorUserId).toBe('user-2');
      expect(fetched.editSummary).toBe('clarify');
    });

    it('throws NotFoundError for an unknown slug', async () => {
      await expect(articleService.getArticleBySlug('does-not-exist')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('hides an unpublished (DRAFT) article from an anonymous visitor', async () => {
      const created = await articleService.createArticle({ title: 'Qaallu', content: 'x' }, 'user-1');
      await expect(articleService.getArticleBySlug(created.slug)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('hides an unpublished article from an unrelated authenticated user', async () => {
      const created = await articleService.createArticle({ title: 'Buna', content: 'x' }, 'user-1');
      await expect(articleService.getArticleBySlug(created.slug, viewer('user-2'))).rejects.toMatchObject({ statusCode: 404 });
    });

    it('lets a moderator see an unpublished article, even without being its author', async () => {
      const created = await articleService.createArticle({ title: 'Michuu', content: 'x' }, 'user-1');
      const mod = await moderator('user-2');
      const fetched = await articleService.getArticleBySlug(created.slug, mod);
      expect(fetched.slug).toBe(created.slug);
    });

    it('lets anyone see a PUBLISHED article', async () => {
      const created = await articleService.createArticle({ title: 'Kalaacha', content: 'x' }, 'user-1');
      const mod = await moderator('mod-1');
      await articleService.submitForReview(created.slug, viewer('user-1'));
      await articleService.startReview(created.slug, mod);
      await articleService.review(created.slug, { decision: ReviewDecision.APPROVE }, mod);
      await articleService.publish(created.slug, mod);

      const fetched = await articleService.getArticleBySlug(created.slug);
      expect(fetched.status).toBe('PUBLISHED');
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

    it('overwrites metadata (summary/language/tags) without versioning it', async () => {
      const created = await articleService.createArticle({ title: 'Meeshaa', content: 'v1', summary: 'old summary' }, 'user-1');
      const edited = await articleService.editArticle(
        created.slug,
        { content: 'v2', summary: 'new summary', tagNames: ['craft'] },
        'user-1',
      );

      expect(edited.summary).toBe('new summary');
      expect(edited.tags.map((t) => t.name)).toEqual(['craft']);
    });
  });

  describe('listArticles', () => {
    it("filters by a case-insensitive title search within what the viewer can see", async () => {
      await articleService.createArticle({ title: 'Afaan Oromo', content: 'x' }, 'user-1');
      await articleService.createArticle({ title: 'Finfinnee', content: 'y' }, 'user-1');

      const result = await articleService.listArticles({ search: 'oromo', page: 1, pageSize: 20 }, viewer('user-1'));
      expect(result.total).toBe(1);
      expect(result.items[0].title).toBe('Afaan Oromo');
    });

    it('shows an anonymous visitor nothing until an article is published', async () => {
      await articleService.createArticle({ title: 'Anonymous Test', content: 'x' }, 'user-1');
      const result = await articleService.listArticles({ page: 1, pageSize: 20 });
      expect(result.total).toBe(0);
    });

    it("shows the author their own drafts even though they aren't published", async () => {
      await articleService.createArticle({ title: 'My Draft', content: 'x' }, 'user-1');
      const result = await articleService.listArticles({ page: 1, pageSize: 20 }, viewer('user-1'));
      expect(result.total).toBe(1);
    });

    it('shows a moderator every article regardless of status', async () => {
      await articleService.createArticle({ title: 'Someone Elses Draft', content: 'x' }, 'user-1');
      const mod = await moderator('mod-1');
      const result = await articleService.listArticles({ page: 1, pageSize: 20 }, mod);
      expect(result.total).toBe(1);
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

  describe('review workflow', () => {
    it('walks an article through the full Draft -> Published lifecycle', async () => {
      const created = await articleService.createArticle({ title: 'Full Lifecycle', content: 'x' }, 'user-1');
      const mod = await moderator('mod-1');

      const submitted = await articleService.submitForReview(created.slug, viewer('user-1'));
      expect(submitted.status).toBe('SUBMITTED');

      const underReview = await articleService.startReview(created.slug, mod);
      expect(underReview.status).toBe('UNDER_REVIEW');

      const approved = await articleService.review(created.slug, { decision: ReviewDecision.APPROVE, comment: 'looks good' }, mod);
      expect(approved.status).toBe('APPROVED');

      const published = await articleService.publish(created.slug, mod);
      expect(published.status).toBe('PUBLISHED');
      expect(published.publishedAt).not.toBeNull();

      const archived = await articleService.archive(created.slug, mod);
      expect(archived.status).toBe('ARCHIVED');

      const reviews = await articleService.listReviews(created.slug);
      expect(reviews).toHaveLength(1);
      expect(reviews[0].decision).toBe(ReviewDecision.APPROVE);
    });

    it('REQUEST_CHANGES sends the article back to DRAFT', async () => {
      const created = await articleService.createArticle({ title: 'Needs Work', content: 'x' }, 'user-1');
      const mod = await moderator('mod-1');
      await articleService.submitForReview(created.slug, viewer('user-1'));
      await articleService.startReview(created.slug, mod);

      const result = await articleService.review(created.slug, { decision: ReviewDecision.REQUEST_CHANGES }, mod);
      expect(result.status).toBe('DRAFT');
    });

    it('rejects a submit attempt from someone who is neither the author nor a moderator', async () => {
      const created = await articleService.createArticle({ title: 'Not Yours', content: 'x' }, 'user-1');
      await expect(articleService.submitForReview(created.slug, viewer('user-2'))).rejects.toMatchObject({ statusCode: 403 });
    });

    it('rejects an invalid transition (e.g. publishing a DRAFT article)', async () => {
      const created = await articleService.createArticle({ title: 'Too Early', content: 'x' }, 'user-1');
      const mod = await moderator('mod-1');
      await expect(articleService.publish(created.slug, mod)).rejects.toMatchObject({ statusCode: 409 });
    });

    it('lets the platform ADMIN override act as a moderator without any wiki_db role assignment', async () => {
      const created = await articleService.createArticle({ title: 'Admin Override', content: 'x' }, 'user-1');
      const admin: RequestingUser = { userId: 'super-admin', roles: ['ADMIN'] };

      await articleService.submitForReview(created.slug, viewer('user-1'));
      const underReview = await articleService.startReview(created.slug, admin);
      expect(underReview.status).toBe('UNDER_REVIEW');
    });
  });
});
