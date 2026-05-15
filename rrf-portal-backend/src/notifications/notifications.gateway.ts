import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Notification } from './notification.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<number, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.getOrThrow<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret });
      const userId = payload.sub;

      if (!userId) {
        client.disconnect();
        return;
      }

      // Store user ID on socket for later use
      (client as any).userId = userId;

      // Join user-specific room
      const room = `user:${userId}`;
      client.join(room);

      // Track connected sockets per user
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId).add(client.id);

      this.logger.log(`User ${userId} connected (socket: ${client.id})`);
    } catch (error: any) {
      this.logger.warn(`Auth failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (userId) {
      const sockets = this.connectedUsers.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.connectedUsers.delete(userId);
        }
      }
      this.logger.log(`User ${userId} disconnected (socket: ${client.id})`);
    }
  }

  /**
   * Send a notification to a specific user (all their connected sockets/tabs).
   */
  sendToUser(userId: number, notification: Notification): void {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit('notification', {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      entityType: notification.entityType,
      entityId: notification.entityId,
      actionUrl: notification.actionUrl,
      createdAt: notification.createdAt,
    });
  }

  /**
   * Send an unread count update to a specific user.
   */
  sendUnreadCount(userId: number, count: number): void {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit('unread-count', { count });
  }
}
