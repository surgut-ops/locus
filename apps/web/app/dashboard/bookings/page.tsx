'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { BookingCard } from '../../../components/BookingCard';
import { getMyBookings } from '../../../services/bookings.service';

type BookingItem = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  listing: {
    title: string;
    city: string;
    country: string;
  };
};

export default function DashboardBookingsPage() {
  const [items, setItems] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMyBookings();
        setItems((data ?? []) as BookingItem[]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-36 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-slate-600">No bookings yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((booking) => (
            <BookingCard
              key={booking.id}
              listingTitle={booking.listing.title}
              city={booking.listing.city}
              country={booking.listing.country}
              startDate={booking.startDate}
              endDate={booking.endDate}
              status={booking.status}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
