import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A free-form label editors can attach to an article — see spec section
 * "5. Tags". Unlike Categories, tags are flat (no hierarchy) and any
 * authenticated editor can create one on the fly while tagging an article,
 * same editing philosophy as article creation itself (see ArticleService's
 * doc comment on why there's no extra role gate). Unique per
 * (name, language) so the same word can exist independently in different
 * languages.
 */
@Entity({ name: 'tags' })
@Index(['name', 'language'], { unique: true })
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 10, default: 'om' })
  language!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
