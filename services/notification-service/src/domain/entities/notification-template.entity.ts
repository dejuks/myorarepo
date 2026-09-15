import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { NotificationChannel } from '@domain/entities/notification.entity';

/**
 * A template keyed by (code, channel) — the same logical event (e.g.
 * PASSWORD_RESET_REQUESTED) can have a separate EMAIL template and an
 * IN_APP template. Bodies use `{{placeholder}}` interpolation, rendered by
 * TemplateRenderer against the event payload.
 */
@Entity({ name: 'notification_templates' })
@Index(['code', 'channel'], { unique: true })
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  code!: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel!: NotificationChannel;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject!: string | null;

  @Column({ name: 'body_template', type: 'text' })
  bodyTemplate!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
