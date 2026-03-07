'use client';

import { motion } from 'framer-motion';

type HostMetricsCardsProps = {
  totalRevenue: number;
  occupancyRate: number;
  listingCount: number;
  bookingsCount: number;
};

export function HostMetricsCards({
  totalRevenue,
  occupancyRate,
  listingCount,
  bookingsCount,
}: HostMetricsCardsProps) {
  const cards = [
    {
      label: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Occupancy Rate',
      value: `${occupancyRate}%`,
      color: 'from-violet-500 to-purple-600',
    },
    {
      label: 'Listings',
      value: String(listingCount),
      color: 'from-amber-500 to-orange-600',
    },
    {
      label: 'Total Bookings',
      value: String(bookingsCount),
      color: 'from-pink-500 to-rose-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className={`overflow-hidden rounded-2xl bg-gradient-to-br ${card.color} p-5 text-white shadow-lg`}
        >
          <p className="text-sm font-medium opacity-90">{card.label}</p>
          <p className="mt-2 text-2xl font-bold">{card.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
