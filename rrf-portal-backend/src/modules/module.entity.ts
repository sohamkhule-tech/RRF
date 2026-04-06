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

@Entity('modules')
@Index(['isActive'])
export class Module {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'module_name', unique: true, length: 100 })
  moduleName: string;

  @Column({ name: 'module_code', unique: true, length: 50 })
  moduleCode: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'parent_module_id', nullable: true })
  parentModuleId: number;

  @Column({ name: 'route_path', length: 255, nullable: true })
  routePath: string;

  @Column({ length: 50, nullable: true })
  icon: string;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
