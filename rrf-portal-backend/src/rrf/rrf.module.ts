import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RrfController } from './rrf.controller';
import { RrfService } from './rrf.service';
import { RrfFormConfigService } from './rrf-form-config.service';
import { Rrf } from './entities/rrf.entity';
import { RrfApprover } from './entities/rrf-approver.entity';
import { RrfFormConfig } from './entities/rrf-form-config.entity';
import { User } from '../users/user.entity';
import { Permission } from '../permissions/permission.entity';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rrf, RrfApprover, RrfFormConfig, User, Permission]),
    PermissionsModule,
  ],
  controllers: [RrfController],
  providers: [RrfService, RrfFormConfigService],
  exports: [RrfService, RrfFormConfigService],
})
export class RrfModule {}
