import { type NotificationType, type PrismaClient } from '@prisma/client';

export class NotificationsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
      },
    });
  }

  public async findByUserId(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  public async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  public async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }
}
