import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { MigrateSubIdService } from './migrate-subid.service';
import { Role } from '../roles/role.entity';
import { Module as ModuleEntity } from '../modules/module.entity';
import { Permission } from '../permissions/permission.entity';
import { RolePermission } from '../role-permissions/role-permission.entity';
import { User } from '../users/user.entity';
import { Rrf } from '../rrf/entities/rrf.entity';
import { RrfApprover } from '../rrf/entities/rrf-approver.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      ModuleEntity,
      Permission,
      RolePermission,
      User,
      Rrf,
      RrfApprover,
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService, MigrateSubIdService],
  exports: [SeedService],
})
export class SeedModule {}
