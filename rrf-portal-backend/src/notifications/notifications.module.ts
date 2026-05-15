import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationListener } from './notification.listener';
import { NotificationRecipientResolver } from './notification-recipient.resolver';
import { NotificationTemplateService } from './notification-template.service';
import { User } from '../users/user.entity';
import { Rrf } from '../rrf/entities/rrf.entity';
import { RrfApprover } from '../rrf/entities/rrf-approver.entity';
import { UserSubfunction } from '../user-subfunctions/user-subfunction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      User,
      Rrf,
      RrfApprover,
      UserSubfunction,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    NotificationListener,
    NotificationRecipientResolver,
    NotificationTemplateService,
  ],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
