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
import { SeedModule } from './database/seeders/seed.module';
import { RrfModule } from './rrf/rrf.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { typeOrmConfig } from './config/typeorm.config';
import { ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.join(process.cwd(), '.env'),
    }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          type: 'postgres',
          host: config.get<string>('DB_HOST'),
          port: parseInt(config.get<string>('DB_PORT') || '5432'),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_DATABASE'),
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: false,
          logging: false,
          retryAttempts: 10,
          retryDelay: 3000,
          ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        }),
      }),
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
    NotificationsModule,
    ReportsModule,
  ],
})
export class AppModule {}
