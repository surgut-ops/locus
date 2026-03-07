import { type NotificationType } from '@prisma/client';

import { NotificationsRepository } from './notifications.repository.js';
import type { CreateNotificationDto, NotificationItem } from './notifications.types.js';
import { NotificationsError } from './notifications.types.js';

export class NotificationsService {
  public constructor(private readonly repository: NotificationsRepository) {}

  public async create(dto: CreateNotificationDto): Promise<void> {
    await this.repository.create(dto);
  }

  public async notifyNewMessage(recipientId: string, senderName: string): Promise<void> {
    await this.create({
      userId: recipientId,
      type: 'NEW_MESSAGE',
      title: 'Новое сообщение',
      message: `${senderName} отправил вам сообщение`,
    });
  }

  public async notifyNewBooking(hostId: string, guestName: string, listingTitle: string): Promise<void> {
    await this.create({
      userId: hostId,
      type: 'NEW_BOOKING',
      title: 'Новое бронирование',
      message: `${guestName} забронировал «${listingTitle}»`,
    });
  }

  public async notifyPaymentSuccess(userId: string, amount: string, currency: string): Promise<void> {
    await this.create({
      userId,
      type: 'PAYMENT_SUCCESS',
      title: 'Оплата прошла успешно',
      message: `Оплата ${amount} ${currency} выполнена`,
    });
  }

  public async notifyListingApproved(ownerId: string, listingTitle: string): Promise<void> {
    await this.create({
      userId: ownerId,
      type: 'LISTING_APPROVED',
      title: 'Объявление одобрено',
      message: `Объявление «${listingTitle}» прошло модерацию`,
    });
  }

  public async notifyReferralInvited(referrerId: string, referredUserName: string): Promise<void> {
    await this.create({
      userId: referrerId,
      type: 'REFERRAL_INVITED',
      title: 'Новый реферал',
      message: `${referredUserName} зарегистрировался по вашей пригласительной ссылке`,
    });
  }

  public async notifyReferralBonus(referrerId: string, amount: string): Promise<void> {
    await this.create({
      userId: referrerId,
      type: 'REFERRAL_BONUS',
      title: 'Бонус за реферала',
      message: `Вам начислено ${amount} кредитов за первую бронь приглашённого пользователя`,
    });
  }

  public async getForUser(userId: string, limit?: number): Promise<NotificationItem[]> {
    const rows = await this.repository.findByUserId(userId, limit);
    return rows.map((r) => ({
      id: r.id,
      type: r.type as NotificationType,
      title: r.title,
      message: r.message,
      read: r.read,
      createdAt: r.createdAt,
    }));
  }

  public async markAsRead(id: string, userId: string): Promise<void> {
    const result = await this.repository.markAsRead(id, userId);
    if (result.count === 0) {
      throw new NotificationsError('Notification not found', 404);
    }
  }

  public async getUnreadCount(userId: string): Promise<number> {
    return this.repository.countUnread(userId);
  }
}
