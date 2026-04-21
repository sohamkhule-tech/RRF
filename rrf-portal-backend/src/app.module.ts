import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { ModulesModule } from './modules/modules.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RolePermissionsModule } from './role-permissions/role-permissions.module';
import { FunctionsModule } from './functions/functions.module';
import { SubfunctionsModule } from './subfunctions/subfunctions.module';
import { UserSubfunctionsModule } from './user-subfunctions/user-subfunctions.module';
import { JobDescriptionsModule } from './job-descriptions/job-descriptions.module';
import { SeedModule } from './database/seed.module';
import { RrfModule } from './rrf/rrf.module';
import { typeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
    // Rate limiting: max 10 requests per 60 seconds globally,
    // tightened per-route on login endpoint
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    UsersModule,
    RolesModule,
    ModulesModule,
    PermissionsModule,
    RolePermissionsModule,
    FunctionsModule,
    SubfunctionsModule,
    UserSubfunctionsModule,
    JobDescriptionsModule,
    SeedModule,
    RrfModule,
  ],
})
export class AppModule {}
