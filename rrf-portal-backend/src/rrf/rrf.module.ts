import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RrfController } from './rrf.controller';
import { RrfService } from './rrf.service';
import { Rrf } from './entities/rrf.entity';
import { RrfApprover } from './entities/rrf-approver.entity';
import { User } from '../users/user.entity';
import { Permission } from '../permissions/permission.entity';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rrf, RrfApprover, User, Permission]),
    PermissionsModule,
  ],
  controllers: [RrfController],
  providers: [RrfService],
  exports: [RrfService],
})
export class RrfModule {}
