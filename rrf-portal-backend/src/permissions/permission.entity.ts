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
import { Module } from '../modules/module.entity';

@Entity('permissions')
@Index(['moduleId'])
@Index(['isActive'])
@Unique(['moduleId', 'permissionCode'])
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'module_id' })
  moduleId: number;

  @ManyToOne(() => Module)
  @JoinColumn({ name: 'module_id' })
  module: Module;

  @Column({ name: 'permission_name', length: 100 })
  permissionName: string;

  @Column({ name: 'permission_code', length: 50 })
  permissionCode: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
