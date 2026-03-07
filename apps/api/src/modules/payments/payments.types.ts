export type CreatePaymentPayload = {
  bookingId: string;
};

export type CreatePaymentResponse = {
  paymentId: string;
  paymentUrl: string;
  amount: string;
  currency: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
};

export class PaymentsError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'PaymentsError';
    this.statusCode = statusCode;
  }
}
