import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * The platform's fixed, code-defined permission catalog (seeded by
 * migration, not created through the API — unlike Role, there is no
 * "custom permission" concept). Each permission gates one specific
 * server-side action; `category` groups them for the GitHub-OAuth-scopes
 * style checkbox UI on a role's edit view (Admin → Roles).
 */
@Entity({ name: 'permissions' })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Stable machine key referenced by requirePermission(), e.g. "users.manage". Never shown to end users. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  key!: string;

  /** Checkbox group heading in the role-permission editor, e.g. "User Management". */
  @Column({ type: 'varchar', length: 100 })
  category!: string;

  /** Human-readable checkbox label, e.g. "Manage users". */
  @Column({ type: 'varchar', length: 150 })
  label!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
