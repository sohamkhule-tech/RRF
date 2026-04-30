import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'createdAt'])
@Index(['type'])
@Index(['entityType', 'entityId'])
@Index(['status'])
@Index(['dedupeKey'], { unique: true, where: '"dedupe_key" IS NOT NULL' })
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ length: 50 })
  type: string;

  @Column({ length: 10, default: 'MEDIUM' })
  priority: string;

  @Column({ name: 'entity_type', length: 30, nullable: true })
  entityType: string;

  @Column({ name: 'entity_id', nullable: true })
  entityId: number;

  @Column({ name: 'action_url', length: 500, nullable: true })
  actionUrl: string;

  @Column({ length: 20, default: 'IN_APP' })
  channel: string;

  @Column({ length: 20, default: 'SENT' })
  status: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'::jsonb" })
  metadata: Record<string, any>;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @Column({ name: 'dedupe_key', length: 255, nullable: true })
  dedupeKey: string;

  @Column({ name: 'delivery_attempts', default: 0 })
  deliveryAttempts: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
