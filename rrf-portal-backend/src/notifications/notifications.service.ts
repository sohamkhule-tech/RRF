import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationChannel } from './enums/notification-channel.enum';
import { NotificationStatus } from './enums/notification-status.enum';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async create(data: Partial<Notification>): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...data,
      channel: data.channel || NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      deliveryAttempts: 1,
    });
    return this.notificationRepository.save(notification);
  }

  async createMany(items: Partial<Notification>[]): Promise<Notification[]> {
    const notifications = items.map((data) =>
      this.notificationRepository.create({
        ...data,
        channel: data.channel || NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        deliveryAttempts: 1,
      }),
    );
    return this.notificationRepository.save(notifications);
  }

  async findAllForUser(
    userId: number,
    query: NotificationQueryDto,
  ): Promise<{ data: Notification[]; total: number; page: number; limit: number }> {
    const { type, isRead, entityType, page = 1, limit = 20 } = query;

    const qb = this.notificationRepository
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .andWhere('n.status != :archived', { archived: NotificationStatus.ARCHIVED })
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) {
      qb.andWhere('n.type = :type', { type });
    }
    if (isRead !== undefined) {
      qb.andWhere('n.isRead = :isRead', { isRead });
    }
    if (entityType) {
      qb.andWhere('n.entityType = :entityType', { entityType });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false, status: NotificationStatus.SENT },
    });
  }

  async markAsRead(id: number, userId: number): Promise<Notification> {
    await this.notificationRepository.update(
      { id, userId },
      { isRead: true, readAt: new Date(), status: NotificationStatus.READ },
    );
    return this.notificationRepository.findOne({ where: { id, userId } });
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date(), status: NotificationStatus.READ },
    );
  }

  async deleteNotification(id: number, userId: number): Promise<void> {
    await this.notificationRepository.update(
      { id, userId },
      { status: NotificationStatus.ARCHIVED },
    );
  }

  /**
   * Check for duplicate notification within last 60 seconds.
   */
  async isDuplicate(dedupeKey: string): Promise<boolean> {
    if (!dedupeKey) return false;
    const existing = await this.notificationRepository.findOne({
      where: { dedupeKey },
    });
    return !!existing;
  }
}
