import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { AddPermissionsController } from './add-permissions.controller';
import { MigrateSubIdService } from './migrate-subid.service';
import { Role } from '../roles/role.entity';
import { Module as ModuleEntity } from '../modules/module.entity';
import { Permission } from '../permissions/permission.entity';
import { RolePermission } from '../role-permissions/role-permission.entity';
import { User } from '../users/user.entity';
import { Rrf } from '../rrf/entities/rrf.entity';
import { RrfApprover } from '../rrf/entities/rrf-approver.entity';
import { RrfFormConfig } from '../rrf/entities/rrf-form-config.entity';
import { Subfunction } from '../subfunctions/subfunction.entity';
import { Function } from '../functions/function.entity';
import { JobDescription } from '../job-descriptions/job-description.entity';

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
      RrfFormConfig,
      Subfunction,
      Function,
      JobDescription,
    ]),
  ],
  controllers: [SeedController, AddPermissionsController],
  providers: [SeedService, MigrateSubIdService],
  exports: [SeedService],
})
export class SeedModule {}
