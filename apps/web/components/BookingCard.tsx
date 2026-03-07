'use client';

import { motion } from 'framer-motion';

type BookingCardProps = {
  listingTitle: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  status: string;
};

export function BookingCard({
  listingTitle,
  city,
  country,
  startDate,
  endDate,
  status,
}: BookingCardProps) {
  const from = new Date(startDate).toLocaleDateString();
  const to = new Date(endDate).toLocaleDateString();

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-slate-200 bg-white p-4"
    >
      <h3 className="text-base font-semibold text-slate-900">{listingTitle}</h3>
      <p className="mt-1 text-sm text-slate-600">
        {city}, {country}
      </p>
      <p className="mt-3 text-sm text-slate-700">
        {from} - {to}
      </p>
      <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase text-slate-700">
        {status}
      </span>
    </motion.article>
  );
}
