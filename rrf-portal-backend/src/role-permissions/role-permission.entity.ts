import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Role } from '../roles/role.entity';
import { Permission } from '../permissions/permission.entity';

@Entity('role_permissions')
@Index(['roleId'])
@Index(['permissionId'])
@Unique(['roleId', 'permissionId'])
export class RolePermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'role_id' })
  roleId: number;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'permission_id' })
  permissionId: number;

  @ManyToOne(() => Permission)
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;

  @Column({ name: 'granted_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  grantedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
