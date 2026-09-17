import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** Many-to-many join between users and roles, modeled explicitly (not via TypeORM @ManyToMany) so assignedBy/assignedAt are first-class. */
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

  /** Null means the assignment never expires. Once set and in the past, `listRoleNamesForUser`/`isAssigned` stop returning this row — see UserRoleAssignmentRepository. */
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;
}
