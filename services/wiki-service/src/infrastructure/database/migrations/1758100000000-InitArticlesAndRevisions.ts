import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1 of the Oromo Wikipedia module: the core content layer (articles +
 * their full, immutable edit history). Everything else in the SRS workflow
 * (moderation/AfD, page protection, blocking, bureaucrat role management,
 * oversight/CheckUser) is a later phase built on top of this — see
 * docs/01-architecture.md's wiki module section.
 *
 * New migration file, not an edit of InitWikiSchema — same reason as every
 * other migration in this platform: production databases already hold real
 * data (role catalogs, assignments) by the time this was written.
 */
export class InitArticlesAndRevisions1758100000000 implements MigrationInterface {
  name = 'InitArticlesAndRevisions1758100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE articles (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title         VARCHAR(300) NOT NULL,
        slug          VARCHAR(320) NOT NULL,
        created_by    UUID NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX idx_articles_slug ON articles(slug);
      CREATE INDEX idx_articles_title ON articles(title);
      CREATE INDEX idx_articles_updated_at ON articles(updated_at DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE revisions (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        article_id        UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        content           TEXT NOT NULL,
        edit_summary      VARCHAR(500),
        editor_user_id    UUID NOT NULL,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_revisions_article_id_created_at ON revisions(article_id, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS revisions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS articles;`);
  }
}
