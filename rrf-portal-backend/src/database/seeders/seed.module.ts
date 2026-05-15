import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { Role } from '../../roles/role.entity';
import { Module as ModuleEntity } from '../../modules/module.entity';
import { Permission } from '../../permissions/permission.entity';
import { RolePermission } from '../../role-permissions/role-permission.entity';
import { User } from '../../users/user.entity';
import { RrfFormConfig } from '../../rrf/entities/rrf-form-config.entity';
import { Subfunction } from '../../subfunctions/subfunction.entity';
import { Function } from '../../functions/function.entity';

@Module({
  imports: [
    // Repository registration for entities used in SeedService.
    // Uses the global DataSource registered by AppModule via TypeOrmModule.forRootAsync().
    // Do NOT declare TypeOrmModule.forRoot() here — SeedModule is a runtime module
    // imported by AppModule, so it must share the app's single DataSource.
    TypeOrmModule.forFeature([
      Role,
      ModuleEntity,
      Permission,
      RolePermission,
      User,
      RrfFormConfig,
      Subfunction,
      Function,
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
