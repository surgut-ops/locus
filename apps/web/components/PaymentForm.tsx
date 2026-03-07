'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';

import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button, Card } from '@locus/ui';

import { trackGrowthEvent } from '../services/growth.service';
import { createPaymentIntent, type CreateIntentResponse } from '../services/payments.service';
import { PaymentStatus } from './PaymentStatus';

type PaymentFormProps = {
  bookingId: string;
  onSuccess?: () => void;
};

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

export function PaymentForm({ bookingId, onSuccess }: PaymentFormProps) {
  const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
  if (!publicKey) {
    return (
      <Card className="space-y-3 p-4">
        <h3 className="text-base font-semibold text-slate-900">Payment</h3>
        <PaymentStatus state="failed" message="Stripe public key is missing in environment." />
      </Card>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentFormInner bookingId={bookingId} onSuccess={onSuccess} />
    </Elements>
  );
}

function PaymentFormInner({ bookingId, onSuccess }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [intent, setIntent] = useState<CreateIntentResponse | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [state, setState] = useState<'idle' | 'processing' | 'succeeded' | 'failed'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadIntent = async () => {
      try {
        setLoadingIntent(true);
        setMessage(null);
        const data = await createPaymentIntent(bookingId);
        if (!cancelled) {
          setIntent(data);
        }
      } catch (error) {
        if (!cancelled) {
          setState('failed');
          setMessage(error instanceof Error ? error.message : 'Unable to initialize payment');
        }
      } finally {
        if (!cancelled) {
          setLoadingIntent(false);
        }
      }
    };

    void loadIntent();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const payButtonLabel = useMemo(() => {
    if (!intent) {
      return 'Pay now';
    }
    return `Pay ${intent.currency.toUpperCase()} ${intent.amount}`;
  }, [intent]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements || !intent?.clientSecret) {
      return;
    }

    setState('processing');
    setMessage('Confirming payment...');

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setState('failed');
      setMessage('Card form is not ready');
      return;
    }

    const result = await stripe.confirmCardPayment(intent.clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    if (result.error) {
      setState('failed');
      setMessage(result.error.message ?? 'Payment failed');
      return;
    }

    if (result.paymentIntent?.status === 'succeeded') {
      setState('succeeded');
      setMessage('Payment succeeded. Booking confirmed.');
      await trackGrowthEvent('complete_payment', {
        bookingId,
        paymentIntentId: result.paymentIntent.id,
      });
      onSuccess?.();
      return;
    }

    setState('processing');
    setMessage(`Payment status: ${result.paymentIntent?.status ?? 'processing'}`);
  };

  return (
    <Card className="space-y-4 p-4">
      <h3 className="text-base font-semibold text-slate-900">Complete payment</h3>
      {loadingIntent ? (
        <PaymentStatus state="processing" message="Creating payment session..." />
      ) : (
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="rounded-lg border border-slate-300 p-3">
            <CardElement
              options={{
                hidePostalCode: true,
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#0f172a',
                    '::placeholder': { color: '#94a3b8' },
                  },
                },
              }}
            />
          </div>

          {intent ? (
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
              Platform fee: {intent.currency.toUpperCase()} {intent.commissionAmount} | Host payout:{' '}
              {intent.currency.toUpperCase()} {intent.hostPayoutAmount}
            </div>
          ) : null}

          <Button disabled={!stripe || loadingIntent || state === 'processing'} className="w-full" type="submit">
            {state === 'processing' ? 'Processing...' : payButtonLabel}
          </Button>
        </form>
      )}

      <PaymentStatus state={state} message={message} />
    </Card>
  );
}
