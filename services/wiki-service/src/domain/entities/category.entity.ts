import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum CategoryStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

/**
 * A hierarchical topic category articles can be filed under (Wikipedia-style
 * category tree) — see spec section "4. Categories". `parentCategoryId` is a
 * self-reference, nullable for a top-level category; cycles are prevented at
 * the service layer, not the database (Postgres has no simple recursive-FK
 * check). `language` is a lightweight ISO code column (not yet a full
 * Language entity — that's Phase 3's Multilingual Management), letting a
 * category tree be scoped per language from day one without blocking on the
 * bigger multilingual build-out.
 */
@Entity({ name: 'categories' })
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Index()
  @Column({ name: 'parent_category_id', type: 'uuid', nullable: true })
  parentCategoryId!: string | null;

  /** ISO 639-1-ish code, e.g. 'om' (Afaan Oromo), 'en'. See Category's doc comment. */
  @Index()
  @Column({ type: 'varchar', length: 10, default: 'om' })
  language!: string;

  @Column({ type: 'varchar', length: 20, default: CategoryStatus.ACTIVE })
  status!: CategoryStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
