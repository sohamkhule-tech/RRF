import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('rrf_form_configs')
export class RrfFormConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'field_name', unique: true, length: 50 })
  fieldName: string;

  @Column({ name: 'field_label', length: 100 })
  label: string;

  @Column({ type: 'jsonb', name: 'field_options' })
  options: string[];

  @Column({ name: 'field_type', length: 50, default: 'dropdown' })
  type: string;

  @Column({ name: 'is_required', default: false })
  isRequired: boolean;

  @Column({ name: 'step', type: 'int', default: 1 })
  step: number;

  @Column({ name: 'section', length: 100, default: 'General' })
  section: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
