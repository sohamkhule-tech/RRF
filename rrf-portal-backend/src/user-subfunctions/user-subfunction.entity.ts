import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Subfunction } from '../subfunctions/subfunction.entity';

@Entity('user_subfunctions')
@Index(['userId', 'subfunctionId'], { unique: true })
export class UserSubfunction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => Subfunction, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'subfunction_id' })
  subfunction: Subfunction;

  @Column({ name: 'subfunction_id' })
  subfunctionId: number;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}
