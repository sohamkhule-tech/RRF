import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermission } from './role-permission.entity';
import { Role } from '../roles/role.entity';
import { Permission } from '../permissions/permission.entity';
import { RolePermissionsController } from './role-permissions.controller';
import { RolePermissionsService } from './role-permissions.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [TypeOrmModule.forFeature([RolePermission, Role, Permission]), PermissionsModule],
  controllers: [RolePermissionsController],
  providers: [RolePermissionsService],
  exports: [TypeOrmModule, RolePermissionsService],
})
export class RolePermissionsModule {}
