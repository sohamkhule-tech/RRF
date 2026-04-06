import { Module as NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module as ModuleEntity } from './module.entity';

@NestModule({
  imports: [TypeOrmModule.forFeature([ModuleEntity])],
  exports: [TypeOrmModule],
})
export class ModulesModule {}
