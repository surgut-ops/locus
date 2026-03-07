import Stripe from 'stripe';

import { PaymentsError } from './payments.types.js';

export class PaymentsStripeClient {
  public readonly stripe: Stripe;
  private readonly webhookSecret: string;

  public constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey) {
      throw new PaymentsError('STRIPE_SECRET_KEY is missing', 500);
    }
    if (!webhookSecret) {
      throw new PaymentsError('STRIPE_WEBHOOK_SECRET is missing', 500);
    }

    this.stripe = new Stripe(secretKey);
    this.webhookSecret = webhookSecret;
  }

  public async createPaymentIntent(params: {
    bookingId: string;
    userId: string;
    amountInCents: number;
    currency: string;
  }) {
    return this.stripe.paymentIntents.create({
      amount: params.amountInCents,
      currency: params.currency.toLowerCase(),
      metadata: {
        bookingId: params.bookingId,
        userId: params.userId,
      },
      capture_method: 'automatic',
      automatic_payment_methods: { enabled: true },
    });
  }

  public async createRefund(paymentIntentId: string) {
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
    });
  }

  public async createTransfer(params: {
    connectedAccountId: string;
    amountInCents: number;
    currency: string;
    bookingId: string;
  }) {
    return this.stripe.transfers.create({
      amount: params.amountInCents,
      currency: params.currency.toLowerCase(),
      destination: params.connectedAccountId,
      metadata: {
        bookingId: params.bookingId,
      },
    });
  }

  public verifyWebhookSignature(payload: Buffer | string, signature: string | undefined) {
    if (!signature) {
      throw new PaymentsError('Missing Stripe signature', 400);
    }
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch {
      throw new PaymentsError('Invalid Stripe webhook signature', 400);
    }
  }
}
