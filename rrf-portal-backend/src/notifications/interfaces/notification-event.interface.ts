import { NotificationType } from '../enums/notification-type.enum';
import { NotificationPriority } from '../enums/notification-priority.enum';
import { NotificationEntityType } from '../enums/notification-entity-type.enum';

export interface NotificationEvent {
  type: NotificationType;
  priority: NotificationPriority;
  entityType: NotificationEntityType;
  entityId: number;
  actorId: number;
  actorName?: string;
  metadata?: Record<string, any>;
}

export interface RrfNotificationEvent extends NotificationEvent {
  rrfId: number;
  subId?: string;
  rrfNumber?: string;
  positionTitle?: string;
  reason?: string;
}

export interface UserNotificationEvent extends NotificationEvent {
  targetUserId: number;
  targetUserName?: string;
  roleName?: string;
}
