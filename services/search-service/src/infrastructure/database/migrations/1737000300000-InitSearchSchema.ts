import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema for search_db — a single derived, rebuildable table
 * (`search_documents`) populated entirely from consumed domain events (see
 * infrastructure/messaging/event-consumer.ts). There is no seed data here,
 * unlike notification-service's migration, because this store originates
 * nothing: it starts empty and fills in as *.published/*.updated events
 * arrive from journal/ebook/library/repository/wiki/researcher services.
 *
 * `search_vector` is a STORED generated column (not maintained by the ORM
 * or app code) so full-text search stays correct automatically on every
 * insert/update — title carries search weight 'A' (highest), description
 * carries weight 'B'.
 */
export class InitSearchSchema1737000300000 implements MigrationInterface {
  name = 'InitSearchSchema1737000300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE search_documents (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type     VARCHAR(100) NOT NULL,
        entity_id       VARCHAR(255) NOT NULL,
        title           TEXT NOT NULL,
        description     TEXT,
        tags            TEXT[],
        url             TEXT,
        source_service  VARCHAR(100) NOT NULL,
        published_at    TIMESTAMPTZ,
        metadata        JSONB,
        search_vector   TSVECTOR GENERATED ALWAYS AS (
                          setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                          setweight(to_tsvector('english', coalesce(description, '')), 'B')
                        ) STORED,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_search_documents_entity UNIQUE (entity_type, entity_id)
      );

      CREATE INDEX idx_search_documents_search_vector ON search_documents USING GIN (search_vector);
      CREATE INDEX idx_search_documents_entity_type ON search_documents (entity_type);
      CREATE INDEX idx_search_documents_source_service ON search_documents (source_service);
      CREATE INDEX idx_search_documents_published_at ON search_documents (published_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS search_documents;`);
  }
}
