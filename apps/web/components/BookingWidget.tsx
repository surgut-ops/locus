'use client';

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

import { Button, Card, Input } from './ui';

import { createBooking } from '../services/bookings.service';
import { trackGrowthEvent } from '../services/growth.service';
import { PaymentForm } from './PaymentForm';

type BookingWidgetProps = {
  listingId: string;
  pricePerNight: number | null;
  currency: string;
  maxGuests: number | null;
};

export function BookingWidget({ listingId, pricePerNight, currency, maxGuests }: BookingWidgetProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [guests, setGuests] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);

  const nights = useMemo(() => {
    if (!startDate || !endDate || !pricePerNight) {
      return 0;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }, [startDate, endDate, pricePerNight]);

  const totalPrice = useMemo(() => {
    if (!pricePerNight) {
      return 0;
    }
    return nights * pricePerNight;
  }, [nights, pricePerNight]);

  const onBook = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const booking = await createBooking({
        listingId,
        startDate,
        endDate,
        guests,
      });
      const bookingId =
        booking && typeof booking === 'object' && 'id' in booking ? String(booking.id) : null;
      if (!bookingId) {
        throw new Error('Booking created but booking id is missing');
      }
      setCreatedBookingId(bookingId);
      setMessage('Booking created. Complete payment to confirm.');
      await trackGrowthEvent('booking_created', {
        bookingId,
        listingId,
        guests,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="space-y-4 p-4 shadow-sm">
        <div>
          <p className="text-lg font-semibold text-slate-900">
            {pricePerNight ? `${currency} ${pricePerNight} / night` : 'Price on request'}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-700">Check-in</label>
          <Input type="date" value={startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-700">Check-out</label>
          <Input type="date" value={endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-700">Guests</label>
          <Input
            type="number"
            min={1}
            max={maxGuests ?? 16}
            value={guests}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGuests(Number(e.target.value))}
          />
        </div>

        <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <p>
            Nights: <span className="font-medium">{nights}</span>
          </p>
          <p>
            Estimated total: <span className="font-semibold">{currency} {totalPrice}</span>
          </p>
        </div>

        <Button disabled={loading} onClick={onBook} className="w-full">
          {loading ? 'Creating booking...' : 'Book now'}
        </Button>

        {message ? <p className="text-xs text-slate-600">{message}</p> : null}
        {createdBookingId ? (
          <PaymentForm
            bookingId={createdBookingId}
            onSuccess={() => setMessage('Payment received. Booking is confirmed.')}
          />
        ) : null}
      </Card>
    </motion.div>
  );
}
