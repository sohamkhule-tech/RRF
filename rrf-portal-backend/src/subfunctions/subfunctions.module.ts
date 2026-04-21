import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subfunction } from './subfunction.entity';
import { Function } from '../functions/function.entity';
import { SubfunctionsService } from './subfunctions.service';
import { SubfunctionsController } from './subfunctions.controller';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subfunction, Function]),
    PermissionsModule
  ],
  providers: [SubfunctionsService],
  controllers: [SubfunctionsController],
  exports: [SubfunctionsService, TypeOrmModule],
})
export class SubfunctionsModule {}
