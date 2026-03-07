import { apiRequest } from '../lib/api';

export type CreateIntentResponse = {
  clientSecret: string;
  paymentIntentId: string;
  amount: string;
  currency: string;
  commissionAmount: string;
  hostPayoutAmount: string;
};

export type PaymentHistoryItem = {
  id: string;
  bookingId: string;
  amount: string;
  currency: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  booking: {
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    listing: {
      id: string;
      title: string;
      city: string;
      country: string;
    };
  };
};

export async function createPaymentIntent(bookingId: string) {
  return apiRequest<CreateIntentResponse>('/payments/create-intent', {
    method: 'POST',
    body: { bookingId },
  });
}

export async function refundPayment(bookingId: string) {
  return apiRequest<{ bookingId: string; refundId: string; status: string }>('/payments/refund', {
    method: 'POST',
    body: { bookingId },
  });
}

export async function getMyPayments() {
  return apiRequest<PaymentHistoryItem[]>('/users/me/payments', { cacheTtlMs: 10_000 });
}
