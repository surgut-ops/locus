'use client';

import { useEffect, useMemo, useState } from 'react';

import { Card, Input } from '@locus/ui';

import { getAdminBookings } from '../../../../services/admin.service';

type AdminBooking = {
  id: string;
  listing: { title: string; city: string; country: string };
  guest: { email: string; firstName: string; lastName: string };
  startDate: string;
  endDate: string;
  totalPrice: string;
  status: string;
  currency: string;
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const load = async () => setBookings(await getAdminBookings());
    void load();
  }, []);

  const filtered = useMemo(
    () => (status ? bookings.filter((booking) => booking.status === status) : bookings),
    [bookings, status],
  );

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Bookings monitoring</h2>
        <Input
          className="max-w-xs"
          placeholder="Filter by status (PENDING/CONFIRMED...)"
          value={status}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatus(e.target.value)}
        />
      </div>
      <div className="space-y-2 text-sm">
        {filtered.map((booking) => (
          <div key={booking.id} className="rounded-lg border border-slate-200 p-3">
            <p className="font-medium">{booking.listing.title}</p>
            <p className="text-slate-600">
              Guest: {booking.guest.email} | {new Date(booking.startDate).toLocaleDateString()} -{' '}
              {new Date(booking.endDate).toLocaleDateString()}
            </p>
            <p className="text-slate-600">
              {booking.currency} {booking.totalPrice} | {booking.status}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
