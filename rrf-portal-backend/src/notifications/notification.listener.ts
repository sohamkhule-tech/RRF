import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { NotificationRecipientResolver } from './notification-recipient.resolver';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationEntityType } from './enums/notification-entity-type.enum';
import { NotificationChannel } from './enums/notification-channel.enum';
import {
  RrfNotificationEvent,
  UserNotificationEvent,
} from './interfaces/notification-event.interface';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private notificationsService: NotificationsService,
    private recipientResolver: NotificationRecipientResolver,
    private templateService: NotificationTemplateService,
    private gateway: NotificationsGateway,
  ) {}

  // ────────────────────────────────────────────────
  // RRF LIFECYCLE EVENTS
  // ────────────────────────────────────────────────

  @OnEvent('rrf.created')
  async handleRrfCreated(event: RrfNotificationEvent) {
    await this.processRrfEvent(event, [
      await this.recipientResolver.resolveByUserId(event.actorId),
    ]);
  }

  @OnEvent('rrf.submitted')
  async handleRrfSubmitted(event: RrfNotificationEvent) {
    await this.processRrfEvent(event, [
      await this.recipientResolver.resolveRrfApprovers(event.rrfId),
    ]);
  }

  @OnEvent('rrf.resubmitted')
  async handleRrfResubmitted(event: RrfNotificationEvent) {
    await this.processRrfEvent(event, [
      await this.recipientResolver.resolveRrfApprovers(event.rrfId),
    ]);
  }

  @OnEvent('rrf.approved')
  async handleRrfApproved(event: RrfNotificationEvent) {
    await this.processRrfEvent(event, [
      await this.recipientResolver.resolveRrfCreator(event.rrfId),
      await this.recipientResolver.resolveByRole('PMO'),
    ]);
  }

  @OnEvent('rrf.rejected')
  async handleRrfRejected(event: RrfNotificationEvent) {
    await this.processRrfEvent(event, [
      await this.recipientResolver.resolveRrfCreator(event.rrfId),
    ]);
  }

  @OnEvent('rrf.declined')
  async handleRrfDeclined(event: RrfNotificationEvent) {
    await this.processRrfEvent(event, [
      await this.recipientResolver.resolveRrfCreator(event.rrfId),
    ]);
  }

  @OnEvent('rrf.on-hold')
  async handleRrfOnHold(event: RrfNotificationEvent) {
    await this.processRrfEvent(event, [
      await this.recipientResolver.resolveRrfCreator(event.rrfId),
      await this.recipientResolver.resolveByRole('PMO'),
    ]);
  }

  @OnEvent('rrf.opened-for-hiring')
  async handleRrfOpenedForHiring(event: RrfNotificationEvent) {
    await this.processRrfEvent(event, [
      await this.recipientResolver.resolveRrfCreator(event.rrfId),
      await this.recipientResolver.resolveByRole('HR'),
    ]);
  }

  @OnEvent('rrf.filled-by-bench')
  async handleRrfFilledByBench(event: RrfNotificationEvent) {
    await this.processRrfEvent(event, [
      await this.recipientResolver.resolveRrfCreator(event.rrfId),
      await this.recipientResolver.resolveRrfApprovers(event.rrfId),
    ]);
  }

  @OnEvent('rrf.closed')
  async handleRrfClosed(event: RrfNotificationEvent) {
    await this.processRrfEvent(event, [
      await this.recipientResolver.resolveRrfCreator(event.rrfId),
      await this.recipientResolver.resolveByRole('PMO'),
    ]);
  }

  @OnEvent('rrf.updated')
  async handleRrfUpdated(event: RrfNotificationEvent) {
    // Notify approvers if pending, or creator if edited by approver
    const recipients: number[][] = [];
    if (event.metadata?.notifyApprovers) {
      recipients.push(await this.recipientResolver.resolveRrfApprovers(event.rrfId));
    }
    if (event.metadata?.notifyCreator) {
      recipients.push(await this.recipientResolver.resolveRrfCreator(event.rrfId));
    }
    if (recipients.length > 0) {
      await this.processRrfEvent(event, recipients);
    }
  }

  @OnEvent('rrf.deleted')
  async handleRrfDeleted(event: RrfNotificationEvent) {
    await this.processRrfEvent(event, [
      await this.recipientResolver.resolveByUserId(event.actorId),
    ]);
  }

  // ────────────────────────────────────────────────
  // USER MANAGEMENT EVENTS
  // ────────────────────────────────────────────────

  @OnEvent('user.created')
  async handleUserCreated(event: UserNotificationEvent) {
    await this.processUserEvent(event, [
      await this.recipientResolver.resolveByUserId(event.targetUserId),
      await this.recipientResolver.resolveByRole('ADMIN'),
    ]);
  }

  @OnEvent('user.updated')
  async handleUserUpdated(event: UserNotificationEvent) {
    await this.processUserEvent(event, [
      await this.recipientResolver.resolveByUserId(event.targetUserId),
    ]);
  }

  @OnEvent('user.role-changed')
  async handleUserRoleChanged(event: UserNotificationEvent) {
    await this.processUserEvent(event, [
      await this.recipientResolver.resolveByUserId(event.targetUserId),
    ]);
  }

  @OnEvent('user.activated')
  async handleUserActivated(event: UserNotificationEvent) {
    await this.processUserEvent(event, [
      await this.recipientResolver.resolveByUserId(event.targetUserId),
    ]);
  }

  @OnEvent('user.deactivated')
  async handleUserDeactivated(event: UserNotificationEvent) {
    await this.processUserEvent(event, [
      await this.recipientResolver.resolveByRole('ADMIN'),
    ]);
  }

  @OnEvent('user.subfunctions-changed')
  async handleUserSubfunctionsChanged(event: UserNotificationEvent) {
    await this.processUserEvent(event, [
      await this.recipientResolver.resolveByUserId(event.targetUserId),
    ]);
  }

  // ────────────────────────────────────────────────
  // CORE PROCESSING
  // ────────────────────────────────────────────────

  private async processRrfEvent(
    event: RrfNotificationEvent,
    recipientGroups: number[][],
  ): Promise<void> {
    try {
      const allRecipients = recipientGroups.flat();
      const recipientIds = this.recipientResolver.deduplicateAndExcludeActor(
        allRecipients,
        event.actorId,
      );

      if (recipientIds.length === 0) return;

      const template = this.templateService.getTemplate(event.type);
      if (!template) return;

      const requestId = event.metadata?.rrfNumber || event.metadata?.subId || `RRF-${event.rrfId}`;
      const rendered = this.templateService.render(template, {
        requestId,
        positionTitle: event.positionTitle || 'Unknown Position',
        actorName: event.actorName || 'System',
        reason: event.reason,
        rrfNumber: event.rrfNumber,
        entityId: event.rrfId,
      });

      const notifications = recipientIds.map((userId) => ({
        userId,
        title: rendered.title,
        message: rendered.message,
        type: event.type,
        priority: template.priority,
        entityType: NotificationEntityType.RRF,
        entityId: event.rrfId,
        actionUrl: rendered.actionUrl,
        channel: NotificationChannel.IN_APP,
        createdBy: event.actorId,
        dedupeKey: `${event.type}:${event.rrfId}:${userId}:${Math.floor(Date.now() / 60000)}`,
        metadata: event.metadata || {},
      }));

      const saved = await this.notificationsService.createMany(notifications);

      // Phase 2: Push via WebSocket
      for (const notification of saved) {
        this.gateway.sendToUser(notification.userId, notification);
      }
    } catch (error: any) {
      this.logger.error(`Error processing ${event.type}: ${error.message}`);
    }
  }

  private async processUserEvent(
    event: UserNotificationEvent,
    recipientGroups: number[][],
  ): Promise<void> {
    try {
      const allRecipients = recipientGroups.flat();
      const recipientIds = this.recipientResolver.deduplicateAndExcludeActor(
        allRecipients,
        event.actorId,
      );

      if (recipientIds.length === 0) return;

      const template = this.templateService.getTemplate(event.type);
      if (!template) return;

      const rendered = this.templateService.render(template, {
        targetUserName: event.targetUserName || 'User',
        actorName: event.actorName || 'System',
        roleName: event.roleName,
        entityId: event.entityId,
      });

      const notifications = recipientIds.map((userId) => ({
        userId,
        title: rendered.title,
        message: rendered.message,
        type: event.type,
        priority: template.priority,
        entityType: NotificationEntityType.USER,
        entityId: event.entityId,
        actionUrl: rendered.actionUrl,
        channel: NotificationChannel.IN_APP,
        createdBy: event.actorId,
        dedupeKey: `${event.type}:${event.entityId}:${userId}:${Math.floor(Date.now() / 60000)}`,
        metadata: event.metadata || {},
      }));

      const saved = await this.notificationsService.createMany(notifications);

      for (const notification of saved) {
        this.gateway.sendToUser(notification.userId, notification);
      }
    } catch (error: any) {
      this.logger.error(`Error processing ${event.type}: ${error.message}`);
    }
  }
}
