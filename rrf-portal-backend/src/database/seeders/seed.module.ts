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
    // ✅ Database connection initialization for standalone seed context
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
      synchronize: false,
      logging: false,
      retryAttempts: 10,
      retryDelay: 3000,
      // Conditional SSL for local Docker vs production
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }),
    // Repository registration for entities used in SeedService
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
