import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** Many-to-many join between members and roles, modeled explicitly (not via TypeORM @ManyToMany) so assignedBy/assignedAt are first-class. */
@Entity({ name: 'user_role_assignments' })
@Index(['userId', 'roleId'], { unique: true })
export class UserRoleAssignment {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId!: string;

  @PrimaryColumn('uuid', { name: 'role_id' })
  roleId!: string;

  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedBy!: string | null;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt!: Date;
}
