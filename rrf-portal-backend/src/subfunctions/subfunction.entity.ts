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
import { Function } from '../functions/function.entity';

@Entity('subfunctions')
@Index(['name'], { unique: true })
@Index(['isActive'])
export class Subfunction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  name: string;

  // ✅ NEW: Proper FK relationship with Functions table
  @ManyToOne(() => Function, (functionEntity) => functionEntity.subfunctions, { eager: true })
  @JoinColumn({ name: 'function_id' })
  functionEntity: Function;

  // ✅ DEPRECATED: Keep old column for backward compatibility during migration
  // Remove this after migration is complete
  @Column({ length: 100, nullable: true })
  function: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
