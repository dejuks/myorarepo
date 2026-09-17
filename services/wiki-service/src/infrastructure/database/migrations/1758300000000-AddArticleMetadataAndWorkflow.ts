import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2: article metadata (summary/language/category/featured image),
 * Categories, Tags, the Draft -> ... -> Published review/approval
 * workflow (article_reviews), and Postgres full-text search over
 * title + summary — see docs/01-architecture.md's Phase 2 section and
 * Article.searchVector's doc comment. Everything here lives in wiki_db
 * only; no other service is involved (search stays standalone per the
 * module's own constraint, rather than delegating to search-service).
 */
export class AddArticleMetadataAndWorkflow1758300000000 implements MigrationInterface {
  name = 'AddArticleMetadataAndWorkflow1758300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE categories (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name                VARCHAR(100) NOT NULL,
        description         VARCHAR(500),
        parent_category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
        language            VARCHAR(10) NOT NULL DEFAULT 'om',
        status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_categories_parent ON categories(parent_category_id);
      CREATE INDEX idx_categories_language ON categories(language);
    `);

    await queryRunner.query(`
      CREATE TABLE tags (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name         VARCHAR(50) NOT NULL,
        description  VARCHAR(255),
        language     VARCHAR(10) NOT NULL DEFAULT 'om',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (name, language)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE article_tags (
        article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (article_id, tag_id)
      );
      CREATE INDEX idx_article_tags_tag_id ON article_tags(tag_id);
    `);

    await queryRunner.query(`
      CREATE TABLE article_reviews (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        article_id        UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        reviewer_user_id  UUID NOT NULL,
        comment           VARCHAR(1000),
        decision          VARCHAR(20) NOT NULL,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_article_reviews_article_id ON article_reviews(article_id);
    `);

    await queryRunner.query(`
      ALTER TABLE articles
        ADD COLUMN summary             VARCHAR(500),
        ADD COLUMN language            VARCHAR(10) NOT NULL DEFAULT 'om',
        ADD COLUMN category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
        ADD COLUMN featured_image_url  VARCHAR(1000),
        ADD COLUMN status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        ADD COLUMN published_at        TIMESTAMPTZ;
    `);
    await queryRunner.query(`CREATE INDEX idx_articles_language ON articles(language);`);
    await queryRunner.query(`CREATE INDEX idx_articles_category_id ON articles(category_id);`);
    await queryRunner.query(`CREATE INDEX idx_articles_status ON articles(status);`);

    // Every article that already existed before this migration is treated as published, so it stays
    // visible the same way it always was (public reads only ever show PUBLISHED articles from here on).
    await queryRunner.query(`UPDATE articles SET status = 'PUBLISHED', published_at = created_at;`);

    await queryRunner.query(`
      ALTER TABLE articles
        ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, ''))) STORED;
    `);
    await queryRunner.query(`CREATE INDEX idx_articles_search_vector ON articles USING GIN(search_vector);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_articles_search_vector;`);
    await queryRunner.query(`ALTER TABLE articles DROP COLUMN IF EXISTS search_vector;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_articles_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_articles_category_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_articles_language;`);
    await queryRunner.query(`
      ALTER TABLE articles
        DROP COLUMN IF EXISTS published_at,
        DROP COLUMN IF EXISTS status,
        DROP COLUMN IF EXISTS featured_image_url,
        DROP COLUMN IF EXISTS category_id,
        DROP COLUMN IF EXISTS language,
        DROP COLUMN IF EXISTS summary;
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS article_reviews;`);
    await queryRunner.query(`DROP TABLE IF EXISTS article_tags;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tags;`);
    await queryRunner.query(`DROP TABLE IF EXISTS categories;`);
  }
}
