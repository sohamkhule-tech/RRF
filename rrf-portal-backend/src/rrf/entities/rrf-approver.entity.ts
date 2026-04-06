import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Rrf } from './rrf.entity';
import { User } from '../../users/user.entity';

export enum ApprovalLevel {
  L1 = 'L1',
  L2 = 'L2',
  L3 = 'L3',
  FINAL = 'final',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SKIPPED = 'skipped',
}

@Entity('rrf_approvers')
@Index(['rrfId'])
@Index(['userId'])
@Index(['approvalLevel'])
@Index(['approvalStatus'])
@Unique(['rrfId', 'userId', 'approvalLevel'])
export class RrfApprover {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'rrf_id' })
  rrfId: number;

  @ManyToOne(() => Rrf, (rrf) => rrf.approvers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rrf_id' })
  rrf: Rrf;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'approval_level',
    type: 'enum',
    enum: ApprovalLevel,
  })
  approvalLevel: ApprovalLevel;

  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approvalStatus: ApprovalStatus;

  @Column({ name: 'approval_order', type: 'int', default: 1 })
  approvalOrder: number;

  @Column({ name: 'comments', type: 'text', nullable: true })
  comments: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ name: 'rejected_at', type: 'timestamp', nullable: true })
  rejectedAt: Date;

  @Column({ name: 'is_mandatory', default: true })
  isMandatory: boolean;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
