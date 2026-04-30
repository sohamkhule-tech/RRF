import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Rrf } from '../rrf/entities/rrf.entity';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rrf]),
    PermissionsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
