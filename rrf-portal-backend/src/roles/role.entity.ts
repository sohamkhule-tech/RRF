import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('roles')
@Index(['isActive'])
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'role_name', unique: true, length: 50 })
  roleName: string;

  @Column({ name: 'role_code', unique: true, length: 20 })
  roleCode: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 0 })
  priority: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
