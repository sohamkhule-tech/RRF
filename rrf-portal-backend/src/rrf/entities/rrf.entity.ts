import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { RrfApprover } from './rrf-approver.entity';

// ============================================
// OLD STATUS ENUM (BACKUP - DO NOT DELETE)
// Rollback: Uncomment this and comment out new enum
// ============================================
/*
export enum RrfStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ON_HOLD = 'on-hold',
  CLOSED = 'closed',
}
*/

// ============================================
// NEW STATUS ENUM - RRF WORKFLOW SYSTEM
// Added: April 1, 2026
// Purpose: Support complete workflow from submission to closure
// Rollback: Comment this out and uncomment old enum above
// ============================================
export enum RrfStatus {
  DRAFT = 'draft',                       // Initial state when creating
  PENDING = 'pending',                   // After Hiring Manager submits - awaiting approval
  SUBMITTED = 'submitted',               // Alias for PENDING (backward compatibility)
  APPROVED = 'approved',                 // After Approver approves
  DECLINED = 'declined',                 // After Approver declines
  REJECTED = 'rejected',                 // Alias for DECLINED (backward compatibility)
  ON_HOLD = 'on-hold',                   // After Approver puts on hold
  OPEN_FOR_HIRING = 'open-for-hiring',   // After PMO opens for hiring
  CLOSED_BY_BENCH = 'closed-by-bench',   // After PMO fills from bench
  CLOSED = 'closed',                     // After HR closes or final state
}

export enum Priority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export enum EmploymentType {
  FULL_TIME = 'Full-time',
  CONTRACT = 'Contract',
  PART_TIME = 'Part-time',
}

export enum RequisitionType {
  BILLABLE = 'Billable',
  NON_BILLABLE = 'Non-Billable',
}

@Entity('rrfs')
@Index(['rrfNumber'])
@Index(['status'])
@Index(['createdById'])
@Index(['department'])
@Index(['createdAt'])
export class Rrf {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sub_id', unique: true, length: 20, nullable: true })
  subId: string;

  @Column({ name: 'rrf_number', unique: true, length: 20, nullable: true })
  rrfNumber: string;

  @Column({ name: 'position_title', length: 200 })
  positionTitle: string;

  @Column({ length: 100, nullable: true })
  department: string;

  @Column({ length: 100, nullable: true })
  entity: string;

  @Column({ length: 100, nullable: true })
  organisation: string;

  @Column({ name: 'requisition_type', type: 'enum', enum: RequisitionType, nullable: true })
  requisitionType: RequisitionType;

  @Column({ name: 'customer_name', length: 200, nullable: true })
  customerName: string;

  @Column({ name: 'non_billable_sub_type', length: 50, nullable: true })
  nonBillableSubType: string;

  @Column({ name: 'function', length: 100, nullable: true })
  function: string;

  @Column({ name: 'sub_function', length: 100, nullable: true })
  subFunction: string;

  @Column({ name: 'project_name', length: 200, nullable: true })
  projectName: string;

  @Column({ type: 'int', default: 1 })
  headcount: number;

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM,
  })
  priority: Priority;

  @Column({
    type: 'enum',
    enum: RrfStatus,
    default: RrfStatus.DRAFT,
  })
  status: RrfStatus;

  @Column({ name: 'job_description', type: 'text', nullable: true })
  jobDescription: string;

  @Column({ name: 'required_skills', type: 'text', nullable: true })
  requiredSkills: string;

  @Column({ name: 'preferred_skills', type: 'text', nullable: true })
  preferredSkills: string;

  @Column({ name: 'experience_min', type: 'decimal', precision: 3, scale: 1, nullable: true })
  experienceMin: number;

  @Column({ name: 'experience_max', type: 'decimal', precision: 3, scale: 1, nullable: true })
  experienceMax: number;

  @Column({ name: 'budget_min', type: 'decimal', precision: 12, scale: 2, nullable: true })
  budgetMin: number;

  @Column({ name: 'budget_max', type: 'decimal', precision: 12, scale: 2, nullable: true })
  budgetMax: number;

  @Column({
    name: 'employment_type',
    type: 'enum',
    enum: EmploymentType,
    default: EmploymentType.FULL_TIME,
  })
  employmentType: EmploymentType;

  @Column({ length: 200, nullable: true })
  location: string;

  @Column({ name: 'urgency_reason', type: 'text', nullable: true })
  urgencyReason: string;

  // Foreign Keys
  @Column({ name: 'created_by_id' })
  createdById: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'pmo_verified_by_id', nullable: true })
  pmoVerifiedById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'pmo_verified_by_id' })
  pmoVerifiedBy: User;

  @Column({ name: 'assigned_to_hr_id', nullable: true })
  assignedToHrId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to_hr_id' })
  assignedToHr: User;

  // ========== WORKFLOW SYSTEM UPDATE START ==========
  // Purpose: Enhanced workflow tracking with actor information
  // Date: April 1, 2026
  // Rollback: Replace with commented OLD WORKFLOW FIELDS below
  // =================================================

  // Workflow timestamps
  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ name: 'approved_by_id', nullable: true })
  approvedById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: User;

  @Column({ name: 'rejected_at', type: 'timestamp', nullable: true })
  rejectedAt: Date;

  @Column({ name: 'declined_at', type: 'timestamp', nullable: true })
  declinedAt: Date;

  @Column({ name: 'declined_by_id', nullable: true })
  declinedById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'declined_by_id' })
  declinedBy: User;

  @Column({ name: 'decline_reason', type: 'text', nullable: true })
  declineReason: string;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date;

  @Column({ name: 'closed_by_id', nullable: true })
  closedById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'closed_by_id' })
  closedBy: User;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Status change audit trail (tracks all status transitions)
  // Stored as JSONB array of status change objects
  @Column({ type: 'jsonb', nullable: true })
  statusHistory: any; // Array of { status, changedBy, changedAt, reason? }

  // ========== WORKFLOW SYSTEM UPDATE END ==========

  // Relations
  @OneToMany(() => RrfApprover, (approver) => approver.rrf)
  approvers: RrfApprover[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
