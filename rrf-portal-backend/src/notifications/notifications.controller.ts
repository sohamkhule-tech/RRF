import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @Query() query: NotificationQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.notificationsService.findAllForUser(user.id, query);
    return { success: true, ...result };
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: AuthUser) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { success: true, data: { count } };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: AuthUser) {
    await this.notificationsService.markAllAsRead(user.id);
    return { success: true, message: 'All notifications marked as read' };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    const notification = await this.notificationsService.markAsRead(id, user.id);
    return { success: true, data: notification };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.notificationsService.deleteNotification(id, user.id);
    return { success: true, message: 'Notification deleted' };
  }
}
