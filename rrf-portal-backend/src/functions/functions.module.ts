import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FunctionsController } from './functions.controller';
import { FunctionsService } from './functions.service';
import { Function } from './function.entity';
import { Subfunction } from '../subfunctions/subfunction.entity';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Function, Subfunction]),
    PermissionsModule
  ],
  controllers: [FunctionsController],
  providers: [FunctionsService],
  exports: [FunctionsService],
})
export class FunctionsModule {}
