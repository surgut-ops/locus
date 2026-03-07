'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

import { listItemReveal, listStagger } from '../animations/motion';
import type { ListingSearchItem } from '../services/api';
import { ListingCardSkeleton } from './ui';

const ListingCard = dynamic(() => import('./ListingCard').then((m) => m.ListingCard), {
  loading: () => <ListingCardSkeleton />,
});

type ListingsGridProps = {
  listings: ListingSearchItem[];
  loading?: boolean;
  emptyMessage?: string;
};

export function ListingsGrid({
  listings,
  loading = false,
  emptyMessage = 'No listings found.',
}: ListingsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.04 }}
          >
            <ListingCardSkeleton />
          </motion.div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600 dark:border-slate-600 dark:text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <motion.div
      variants={listStagger}
      initial="hidden"
      animate="visible"
      className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
    >
      {listings.map((listing) => (
        <motion.div key={listing.id} variants={listItemReveal}>
          <ListingCard listing={listing} />
        </motion.div>
      ))}
    </motion.div>
  );
}
