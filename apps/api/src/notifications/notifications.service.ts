import {
  Injectable,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Notification, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationFiltersDto } from './dto/notification-filters.dto';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createNotification(data: CreateNotificationData): Promise<Notification> {
    return this.prisma.notification.create({ data });
  }

  createNotificationAsync(data: CreateNotificationData): void {
    void this.createNotification(data).catch((err: unknown) => {
      this.logger.error('Notification create failed', String(err));
    });
  }

  async createForRole(
    roleKey: string,
    data: Omit<CreateNotificationData, 'userId'>,
  ): Promise<void> {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          role: { key: roleKey },
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (users.length === 0) return;

      await this.prisma.notification.createMany({
        data: users.map((u) => ({ ...data, userId: u.id })),
      });
    } catch (err) {
      this.logger.error('createForRole failed', String(err));
    }
  }

  createForRoleAsync(
    roleKey: string,
    data: Omit<CreateNotificationData, 'userId'>,
  ): void {
    void this.createForRole(roleKey, data);
  }

  async findAll(userId: string, filters: NotificationFiltersDto) {
    const where: {
      userId: string;
      readAt?: null;
      type?: NotificationType;
      createdAt?: { gte: Date };
    } = { userId };

    if (filters.unread) where.readAt = null;
    if (filters.type) where.type = filters.type;
    if (filters.dateFrom) {
      where.createdAt = { gte: new Date(filters.dateFrom) };
    }

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);

    return {
      notifications: notifications.map((n) => this.serialize(n)),
      unreadCount,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Cannot mark another user notification');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return this.serialize(updated);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }

  private serialize(notification: Notification) {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
