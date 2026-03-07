import Stripe from 'stripe';

import { PaymentsService } from './payments.service.js';
import { PaymentsStripeClient } from './payments.stripe.js';
import { PaymentsError } from './payments.types.js';

export class PaymentsWebhooksHandler {
  public constructor(
    private readonly stripeClient: PaymentsStripeClient,
    private readonly service: PaymentsService,
  ) {}

  public async handle(rawBody: Buffer | string | undefined, signature: string | undefined) {
    if (!rawBody) {
      throw new PaymentsError('Missing raw webhook body', 400);
    }
    const event = this.stripeClient.verifyWebhookSignature(rawBody, signature);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.onPaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.onPaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await this.onChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        break;
    }

    return { received: true };
  }

  private async onPaymentIntentSucceeded(intent: Stripe.PaymentIntent): Promise<void> {
    const bookingId = intent.metadata?.bookingId;
    if (!bookingId) {
      return;
    }
    await this.service.handlePaymentSucceeded(bookingId);
  }

  private async onPaymentIntentFailed(intent: Stripe.PaymentIntent): Promise<void> {
    const bookingId = intent.metadata?.bookingId;
    if (!bookingId) {
      return;
    }
    await this.service.handlePaymentFailed(bookingId);
  }

  private async onChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
    if (!intentId) {
      return;
    }
    const bookingId = await this.service.getBookingIdByIntentId(intentId);
    if (!bookingId) {
      return;
    }
    await this.service.handleChargeRefunded(bookingId);
  }
}
