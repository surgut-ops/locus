'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

import { listItemReveal, listStagger } from '../animations/motion';
import type { MatchRecommendationItem } from '../services/api';
import { ListingCard } from './ListingCard';
import { ListingCardSkeleton } from './ui';

type MatchListingsGridProps = {
  items: MatchRecommendationItem[];
  loading?: boolean;
  emptyMessage?: string;
};

export function MatchListingsGrid({
  items,
  loading = false,
  emptyMessage = 'No recommendations yet. Search and view listings to get personalized suggestions.',
}: MatchListingsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, index) => (
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

  if (items.length === 0) {
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
      {items.map((item) => (
        <motion.div key={item.listing.id} variants={listItemReveal}>
          <ListingCard
            listing={item.listing}
            showAiMatchBadge
            matchScore={item.matchScore}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
