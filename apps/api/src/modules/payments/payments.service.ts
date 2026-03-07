import { BookingStatus, PaymentStatus, Prisma } from '@prisma/client';
import Redis from 'ioredis';

import { getQueueService } from '../infrastructure/queue/queue.service.js';
import type { AuthenticatedUser } from '../../utils/auth.js';
import { PaymentsRepository } from './payments.repository.js';
import { type YooKassaWebhookPayload, PaymentsYooKassaClient } from './payments.yookassa.js';
import {
  type CreatePaymentPayload,
  type CreatePaymentResponse,
  PaymentsError,
} from './payments.types.js';

export class PaymentsService {
  private readonly redis: Redis | null;
  private readonly fallbackProviderPaymentBooking = new Map<string, string>();

  public constructor(
    private readonly repository: PaymentsRepository,
    private readonly yookassaClient: PaymentsYooKassaClient,
    private readonly notificationsService?: import('../notifications/notifications.service.js').NotificationsService,
    private readonly referralService?: import('../referral/referral.service.js').ReferralService,
  ) {
    const redisUrl = process.env.REDIS_URL ?? null;
    this.redis = redisUrl ? new Redis(redisUrl) : null;
  }

  public async createPayment(
    actor: AuthenticatedUser,
    payload: unknown,
  ): Promise<CreatePaymentResponse> {
    const dto = parseCreatePaymentPayload(payload);
    const booking = await this.repository.getBookingById(dto.bookingId);
    if (!booking) {
      throw new PaymentsError('Booking not found', 404);
    }
    if (booking.guestId !== actor.id) {
      throw new PaymentsError('Only booking guest can pay', 403);
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new PaymentsError('Only pending bookings can be paid', 400);
    }

    const latestPayment = await this.repository.getPaymentByBookingId(booking.id);
    if (latestPayment?.status === PaymentStatus.SUCCEEDED) {
      throw new PaymentsError('Booking is already paid', 409);
    }

    const amount = new Prisma.Decimal(booking.totalPrice);
    if (amount.lte(0)) {
      throw new PaymentsError('Invalid booking amount', 400);
    }

    if (!latestPayment || latestPayment.status !== PaymentStatus.PENDING) {
      await this.repository.createPendingPayment({
        bookingId: booking.id,
        userId: actor.id,
        amount,
        currency: booking.currency,
        provider: 'yookassa',
      });
    }

    const returnUrl = process.env.YOOKASSA_RETURN_URL ?? 'https://example.com/payments/return';
    const providerPayment = await this.yookassaClient.createPayment({
      bookingId: booking.id,
      userId: actor.id,
      amount: amount.toFixed(2),
      currency: booking.currency.toUpperCase(),
      returnUrl,
      description: `Booking #${booking.id}`,
    });

    await this.linkProviderPaymentToBooking(booking.id, providerPayment.id);

    const latest = await this.repository.getPaymentByBookingId(booking.id);
    if (!latest) {
      throw new PaymentsError('Payment record not found', 500);
    }

    return {
      paymentId: latest.id,
      paymentUrl: providerPayment.paymentUrl,
      amount: amount.toString(),
      currency: booking.currency,
      status: latest.status,
    };
  }

  public async processWebhook(
    rawBody: Buffer | string | undefined,
    signature: string | undefined,
  ): Promise<{ received: true }> {
    this.yookassaClient.verifyWebhookSignature(rawBody, signature);
    const parsed = parseWebhookPayload(rawBody);

    const providerPaymentId = requireString(parsed.object?.id, 'Webhook payment id is missing');
    const providerStatus = parsed.object?.status;
    const bookingIdFromMetadata = parsed.object?.metadata?.bookingId;
    const bookingIdFromCache = await this.getBookingIdByProviderPaymentId(providerPaymentId);
    const bookingId = bookingIdFromMetadata ?? bookingIdFromCache;
    if (!bookingId) {
      throw new PaymentsError('Booking not found for webhook payment', 404);
    }

    const paymentStatus = mapYooKassaStatus(providerStatus);
    await this.repository.updatePaymentStatusByBooking(bookingId, paymentStatus);

    if (paymentStatus === PaymentStatus.SUCCEEDED) {
      await this.repository.setBookingStatus(bookingId, BookingStatus.CONFIRMED);
      const booking = await this.repository.getBookingById(bookingId);
      if (booking) {
        const amount = String(booking.totalPrice ?? 0);
        const currency = booking.listing?.currency ?? 'USD';
        const listingTitle = booking.listing?.title;
        if (this.notificationsService) {
          this.notificationsService
            .notifyPaymentSuccess(booking.guestId, amount, currency)
            .catch(() => {});
        }
        if (this.referralService) {
          this.referralService.processFirstBookingReward(booking.guestId, bookingId).catch(() => {});
        }
        const queueService = getQueueService();
        if (queueService) {
          const guestEmail = await this.repository.getUserEmail(booking.guestId);
          const guestName = await this.repository.getUserName(booking.guestId);
          if (guestEmail) {
            await queueService.addEmailJob({
              template: 'payment_confirmation',
              to: guestEmail,
              subject: 'Оплата прошла успешно — LOCUS',
              data: {
                guestName: guestName || 'Гость',
                amount,
                currency,
                listingTitle,
              },
            });
          }
        }
      }
    }

    return { received: true };
  }

  public async handlePaymentSucceeded(bookingId: string): Promise<void> {
    await this.repository.updatePaymentStatusByBooking(bookingId, PaymentStatus.SUCCEEDED);
    await this.repository.setBookingStatus(bookingId, BookingStatus.CONFIRMED);
    const booking = await this.repository.getBookingById(bookingId);
    if (booking) {
      const amount = String(booking.totalPrice ?? 0);
      const currency = booking.listing?.currency ?? 'USD';
      const listingTitle = booking.listing?.title;
      if (this.notificationsService) {
        this.notificationsService
          .notifyPaymentSuccess(booking.guestId, amount, currency)
          .catch(() => {});
      }
      if (this.referralService) {
        this.referralService.processFirstBookingReward(booking.guestId, bookingId).catch(() => {});
      }
      const queueService = getQueueService();
      if (queueService) {
        const guestEmail = await this.repository.getUserEmail(booking.guestId);
        const guestName = await this.repository.getUserName(booking.guestId);
        if (guestEmail) {
          await queueService.addEmailJob({
            template: 'payment_confirmation',
            to: guestEmail,
            subject: 'Оплата прошла успешно — LOCUS',
            data: {
              guestName: guestName || 'Гость',
              amount,
              currency,
              listingTitle,
            },
          });
        }
      }
    }
  }

  public async handlePaymentFailed(bookingId: string): Promise<void> {
    await this.repository.updatePaymentStatusByBooking(bookingId, PaymentStatus.FAILED);
  }

  public async handleChargeRefunded(bookingId: string): Promise<void> {
    await this.repository.updatePaymentStatusByBooking(bookingId, PaymentStatus.REFUNDED);
  }

  public async getMyPayments(actor: AuthenticatedUser) {
    return this.repository.getUserPayments(actor.id);
  }

  public async getBookingIdByProviderPaymentId(providerPaymentId: string): Promise<string | null> {
    const key = `payment:provider:${providerPaymentId}:booking`;
    if (this.redis) {
      return this.redis.get(key);
    }
    return this.fallbackProviderPaymentBooking.get(providerPaymentId) ?? null;
  }

  public async getBookingIdByIntentId(intentId: string): Promise<string | null> {
    return this.getBookingIdByProviderPaymentId(intentId);
  }

  private async linkProviderPaymentToBooking(bookingId: string, providerPaymentId: string): Promise<void> {
    const key = `payment:provider:${providerPaymentId}:booking`;
    if (this.redis) {
      await this.redis.set(key, bookingId, 'EX', 60 * 60 * 24 * 7);
      return;
    }
    this.fallbackProviderPaymentBooking.set(providerPaymentId, bookingId);
  }
}

function parseCreatePaymentPayload(payload: unknown): CreatePaymentPayload {
  if (!isObject(payload)) {
    throw new PaymentsError('Invalid payload', 400);
  }

  const bookingId = requireString(payload.bookingId, 'bookingId');
  return { bookingId };
}

function parseWebhookPayload(rawBody: Buffer | string | undefined): YooKassaWebhookPayload {
  if (!rawBody) {
    throw new PaymentsError('Missing raw webhook body', 400);
  }
  const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  try {
    return JSON.parse(body) as YooKassaWebhookPayload;
  } catch {
    throw new PaymentsError('Invalid webhook payload', 400);
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new PaymentsError(`Field "${field}" is required`, 400);
  }
  return value.trim();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function mapYooKassaStatus(status: unknown): PaymentStatus {
  if (status === 'succeeded') {
    return PaymentStatus.SUCCEEDED;
  }
  if (status === 'canceled') {
    return PaymentStatus.FAILED;
  }
  if (status === 'refunded') {
    return PaymentStatus.REFUNDED;
  }
  return PaymentStatus.PENDING;
}
