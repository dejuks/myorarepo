import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Platform roles (USER, RESEARCHER, AUTHOR, EDITOR, REVIEWER, LIBRARIAN,
 * ADMIN, ...). `isSystem` roles are seeded at migration time and cannot be
 * deleted through the API, only created/deleted for custom roles an
 * administrator adds later.
 */
@Entity({ name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  name!: string;

  // 500, not the platform's usual 255 — see InitWikiSchema1737000800000's doc comment.
  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
