import type { NotificationType } from '@prisma/client';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
};

export type CreateNotificationDto = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
};

export class NotificationsError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'NotificationsError';
    this.statusCode = statusCode;
  }
}
