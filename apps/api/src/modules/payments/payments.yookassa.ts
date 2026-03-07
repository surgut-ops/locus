import { createHash, randomUUID } from 'node:crypto';

import { PaymentsError } from './payments.types.js';

const YOOKASSA_API_BASE = 'https://api.yookassa.ru/v3';

type YooKassaCreatePaymentInput = {
  amount: string;
  currency: string;
  bookingId: string;
  userId: string;
  returnUrl: string;
  description: string;
};

type YooKassaCreatePaymentResponse = {
  id: string;
  status: string;
  confirmation?: {
    type?: string;
    confirmation_url?: string;
  };
};

export type YooKassaWebhookPayload = {
  event?: string;
  object?: {
    id?: string;
    status?: string;
    metadata?: {
      bookingId?: string;
    };
  };
};

export class PaymentsYooKassaClient {
  private readonly shopId: string;
  private readonly secretKey: string;

  public constructor() {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!shopId) {
      throw new PaymentsError('YOOKASSA_SHOP_ID is missing', 500);
    }
    if (!secretKey) {
      throw new PaymentsError('YOOKASSA_SECRET_KEY is missing', 500);
    }

    this.shopId = shopId;
    this.secretKey = secretKey;
  }

  public async createPayment(input: YooKassaCreatePaymentInput): Promise<{
    id: string;
    status: string;
    paymentUrl: string;
  }> {
    const response = await fetch(`${YOOKASSA_API_BASE}/payments`, {
      method: 'POST',
      headers: {
        Authorization: this.buildAuthHeader(),
        'Content-Type': 'application/json',
        'Idempotence-Key': randomUUID(),
      },
      body: JSON.stringify({
        amount: {
          value: input.amount,
          currency: input.currency,
        },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: input.returnUrl,
        },
        description: input.description,
        metadata: {
          bookingId: input.bookingId,
          userId: input.userId,
        },
      }),
    });

    if (!response.ok) {
      throw new PaymentsError(`YooKassa create payment failed: ${response.status}`, 502);
    }

    const payload = (await response.json()) as YooKassaCreatePaymentResponse;
    const paymentUrl = payload.confirmation?.confirmation_url;
    if (!payload.id || !paymentUrl) {
      throw new PaymentsError('Invalid YooKassa response', 502);
    }

    return {
      id: payload.id,
      status: payload.status,
      paymentUrl,
    };
  }

  public verifyWebhookSignature(rawBody: Buffer | string | undefined, signatureHeader: string | undefined): void {
    if (!rawBody) {
      throw new PaymentsError('Missing raw webhook body', 400);
    }
    if (!signatureHeader) {
      throw new PaymentsError('Missing YooKassa webhook signature', 400);
    }

    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expected = createHash('sha256').update(`${body}${this.secretKey}`).digest('hex');
    if (expected !== signatureHeader) {
      throw new PaymentsError('Invalid YooKassa webhook signature', 400);
    }
  }

  private buildAuthHeader(): string {
    const token = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');
    return `Basic ${token}`;
  }
}
