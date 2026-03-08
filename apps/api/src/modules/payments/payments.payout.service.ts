import type Redis from 'ioredis';

import { getSharedRedis } from '../../lib/redis.client.js';
import { PaymentsStripeClient } from './payments.stripe.js';
import { type PaymentsRepository } from './payments.repository.js';

const COMMISSION_RATE = 0.1;

export class PaymentsPayoutService {
  private readonly redis: Redis | null;
  private readonly fallbackPaidOut = new Set<string>();

  public constructor(
    private readonly repository: PaymentsRepository,
    private readonly stripeClient: PaymentsStripeClient,
  ) {
    this.redis = getSharedRedis();
  }

  public async releaseDuePayouts(): Promise<{ released: number; skipped: number }> {
    const due = await this.repository.getDuePayoutBookings(new Date());
    let released = 0;
    let skipped = 0;

    for (const booking of due) {
      const alreadyPaid = await this.isPayoutReleased(booking.id);
      if (alreadyPaid) {
        skipped += 1;
        continue;
      }

      const connectedAccountId = await this.getHostConnectedAccountId(booking.listing.ownerId);
      if (!connectedAccountId) {
        skipped += 1;
        continue;
      }

      const hostPayoutCents = Math.max(
        0,
        Math.round(Number(booking.totalPrice) * 100 - Number(booking.totalPrice) * 100 * COMMISSION_RATE),
      );

      await this.stripeClient.createTransfer({
        connectedAccountId,
        amountInCents: hostPayoutCents,
        currency: booking.currency,
        bookingId: booking.id,
      });

      await this.markPayoutReleased(booking.id);
      released += 1;
    }

    return { released, skipped };
  }

  private async getHostConnectedAccountId(hostId: string): Promise<string | null> {
    const key = `user:${hostId}:stripe_account_id`;
    if (this.redis) {
      return this.redis.get(key);
    }
    return null;
  }

  private async isPayoutReleased(bookingId: string): Promise<boolean> {
    const key = `payment:payout:${bookingId}`;
    if (this.redis) {
      return (await this.redis.get(key)) === '1';
    }
    return this.fallbackPaidOut.has(bookingId);
  }

  private async markPayoutReleased(bookingId: string): Promise<void> {
    const key = `payment:payout:${bookingId}`;
    if (this.redis) {
      await this.redis.set(key, '1', 'EX', 60 * 60 * 24 * 365);
      return;
    }
    this.fallbackPaidOut.add(bookingId);
  }
}
