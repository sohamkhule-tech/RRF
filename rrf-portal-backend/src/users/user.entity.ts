import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Role } from '../roles/role.entity';
import { UserSubfunction } from '../user-subfunctions/user-subfunction.entity';

@Entity('users')
@Index(['email'])
@Index(['userId'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', unique: true, length: 50 })
  userId: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ length: 100, nullable: true })
  department: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin: Date;

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;
  @OneToMany(() => UserSubfunction, (userSubfunction) => userSubfunction.user)
  userSubfunctions: UserSubfunction[];

  @Column({ 
    type: 'jsonb', 
    nullable: true, 
    default: () => "'[]'::jsonb",
    name: 'technologies'
  })
  technologies: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
