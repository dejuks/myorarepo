import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Journal module roles (JOURNAL_MANAGER, EDITOR_IN_CHIEF, ASSOCIATE_EDITOR,
 * REVIEWER, AUTHOR, ...). `isSystem` roles are seeded at migration time and
 * cannot be deleted through the API, only created/deleted for custom roles
 * an administrator adds later.
 */
@Entity({ name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
