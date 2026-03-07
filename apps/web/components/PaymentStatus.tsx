'use client';

type PaymentState = 'idle' | 'processing' | 'succeeded' | 'failed';

type PaymentStatusProps = {
  state: PaymentState;
  message?: string | null;
};

export function PaymentStatus({ state, message }: PaymentStatusProps) {
  const tone =
    state === 'succeeded'
      ? 'bg-emerald-50 text-emerald-700'
      : state === 'failed'
        ? 'bg-red-50 text-red-700'
        : state === 'processing'
          ? 'bg-amber-50 text-amber-700'
          : 'bg-slate-50 text-slate-600';

  return (
    <div className={`rounded-lg px-3 py-2 text-xs ${tone}`}>
      {message ??
        (state === 'succeeded'
          ? 'Payment completed. Booking is confirmed.'
          : state === 'failed'
            ? 'Payment failed. Try another card.'
            : state === 'processing'
              ? 'Payment is processing...'
              : 'Ready for payment')}
    </div>
  );
}
