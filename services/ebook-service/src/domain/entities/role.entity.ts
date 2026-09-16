import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Module roles for the ORA eBook Publishing System (BOOK_EDITOR,
 * DIGITAL_CONTENT_MANAGER, FINANCE_OPERATIONS_OFFICER, AUTHOR_RESEARCHER,
 * ...). `isSystem` roles are seeded at migration time and cannot be
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

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
