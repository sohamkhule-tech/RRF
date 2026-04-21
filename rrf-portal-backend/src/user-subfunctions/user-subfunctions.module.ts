import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSubfunction } from './user-subfunction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserSubfunction])],
  exports: [TypeOrmModule],
})
export class UserSubfunctionsModule {}
