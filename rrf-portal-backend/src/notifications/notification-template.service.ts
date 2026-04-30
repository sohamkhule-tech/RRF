import { Injectable } from '@nestjs/common';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationPriority } from './enums/notification-priority.enum';

interface TemplateDefinition {
  title: string;
  message: string;
  priority: NotificationPriority;
  actionUrl?: string;
}

@Injectable()
export class NotificationTemplateService {
  private templates: Record<string, TemplateDefinition> = {
    [NotificationType.RRF_CREATED]: {
      title: 'RRF Created',
      message: '{{requestId}} "{{positionTitle}}" has been created.',
      priority: NotificationPriority.LOW,
      actionUrl: '/hiring-manager/view-rrf/{{entityId}}',
    },
    [NotificationType.RRF_SUBMITTED]: {
      title: 'New RRF Awaiting Approval',
      message: '{{requestId}} "{{positionTitle}}" submitted by {{actorName}} requires your approval.',
      priority: NotificationPriority.HIGH,
      actionUrl: '/approver/review/{{entityId}}',
    },
    [NotificationType.RRF_RESUBMITTED]: {
      title: 'RRF Resubmitted',
      message: '{{requestId}} "{{positionTitle}}" has been resubmitted by {{actorName}} after revision.',
      priority: NotificationPriority.HIGH,
      actionUrl: '/approver/review/{{entityId}}',
    },
    [NotificationType.RRF_APPROVED]: {
      title: 'RRF Approved',
      message: '{{requestId}} "{{positionTitle}}" has been approved by {{actorName}}.',
      priority: NotificationPriority.HIGH,
      actionUrl: '/pmo/view-rrf/{{entityId}}',
    },
    [NotificationType.RRF_REJECTED]: {
      title: 'RRF Rejected',
      message: '{{requestId}} "{{positionTitle}}" was rejected by {{actorName}}.{{reason}}',
      priority: NotificationPriority.HIGH,
      actionUrl: '/hiring-manager/view-rrf/{{entityId}}',
    },
    [NotificationType.RRF_DECLINED]: {
      title: 'RRF Declined',
      message: '{{requestId}} "{{positionTitle}}" was declined by {{actorName}}.{{reason}}',
      priority: NotificationPriority.HIGH,
      actionUrl: '/hiring-manager/view-rrf/{{entityId}}',
    },
    [NotificationType.RRF_ON_HOLD]: {
      title: 'RRF Put On Hold',
      message: '{{requestId}} "{{positionTitle}}" has been put on hold by {{actorName}}.{{reason}}',
      priority: NotificationPriority.MEDIUM,
      actionUrl: '/hiring-manager/view-rrf/{{entityId}}',
    },
    [NotificationType.RRF_OPENED_FOR_HIRING]: {
      title: 'RRF Opened for Hiring',
      message: '{{requestId}} "{{positionTitle}}" is now open for hiring. RRF Number: {{rrfNumber}}.',
      priority: NotificationPriority.HIGH,
      actionUrl: '/hr/view-rrf/{{entityId}}',
    },
    [NotificationType.RRF_FILLED_BY_BENCH]: {
      title: 'RRF Filled from Bench',
      message: '{{requestId}} "{{positionTitle}}" has been filled from internal bench.',
      priority: NotificationPriority.MEDIUM,
      actionUrl: '/pmo/view-rrf/{{entityId}}',
    },
    [NotificationType.RRF_CLOSED]: {
      title: 'RRF Closed',
      message: '{{requestId}} "{{positionTitle}}" has been closed.',
      priority: NotificationPriority.MEDIUM,
      actionUrl: '/pmo/view-rrf/{{entityId}}',
    },
    [NotificationType.RRF_UPDATED]: {
      title: 'RRF Updated',
      message: '{{requestId}} "{{positionTitle}}" has been updated by {{actorName}}.',
      priority: NotificationPriority.LOW,
      actionUrl: '/hiring-manager/view-rrf/{{entityId}}',
    },
    [NotificationType.RRF_DELETED]: {
      title: 'RRF Deleted',
      message: '{{requestId}} "{{positionTitle}}" has been deleted.',
      priority: NotificationPriority.LOW,
    },
    [NotificationType.USER_CREATED]: {
      title: 'New User Created',
      message: 'User "{{targetUserName}}" has been created with role {{roleName}}.',
      priority: NotificationPriority.MEDIUM,
      actionUrl: '/admin/users',
    },
    [NotificationType.USER_UPDATED]: {
      title: 'Profile Updated',
      message: 'Your profile has been updated by an administrator.',
      priority: NotificationPriority.LOW,
    },
    [NotificationType.USER_ROLE_CHANGED]: {
      title: 'Role Changed',
      message: 'Your role has been changed to {{roleName}}.',
      priority: NotificationPriority.MEDIUM,
    },
    [NotificationType.USER_ACTIVATED]: {
      title: 'Account Activated',
      message: 'Your account has been activated.',
      priority: NotificationPriority.MEDIUM,
    },
    [NotificationType.USER_DEACTIVATED]: {
      title: 'User Deactivated',
      message: 'User "{{targetUserName}}" has been deactivated.',
      priority: NotificationPriority.MEDIUM,
      actionUrl: '/admin/users',
    },
    [NotificationType.USER_SUBFUNCTIONS_CHANGED]: {
      title: 'Subfunctions Updated',
      message: 'Your assigned subfunctions have been updated.',
      priority: NotificationPriority.MEDIUM,
    },
    [NotificationType.SYSTEM_ANNOUNCEMENT]: {
      title: 'System Announcement',
      message: '{{message}}',
      priority: NotificationPriority.MEDIUM,
    },
  };

  getTemplate(type: NotificationType): TemplateDefinition | null {
    return this.templates[type] || null;
  }

  render(
    template: TemplateDefinition,
    data: Record<string, any>,
  ): { title: string; message: string; actionUrl?: string } {
    const reasonSuffix = data.reason ? ` Reason: ${data.reason}` : '';
    const renderData = { ...data, reason: reasonSuffix };

    return {
      title: this.interpolate(template.title, renderData),
      message: this.interpolate(template.message, renderData),
      actionUrl: template.actionUrl
        ? this.interpolate(template.actionUrl, renderData)
        : undefined,
    };
  }

  private interpolate(text: string, data: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = data[key];
      return value !== undefined && value !== null ? String(value) : '';
    });
  }
}
