'use client';

import { motion } from 'framer-motion';
import { Link } from '../../i18n/navigation';

type PricePerformanceItem = {
  listingId: string;
  title: string;
  listingPrice: number;
  marketAveragePrice: number;
  priceDifferencePercent: number;
  status: string;
};

type HostPricePerformanceProps = {
  items: PricePerformanceItem[];
};

export function HostPricePerformance({ items }: HostPricePerformanceProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Price vs market
        </h3>
        <p className="mt-2 text-sm text-slate-500">No listings with prices yet.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50"
    >
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Price vs market
      </h3>
      <div className="mt-4 space-y-3">
        {items.slice(0, 5).map((item) => (
          <div
            key={item.listingId}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/30"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={`/listings/${item.listingId}`}
                className="truncate font-medium text-slate-900 hover:underline dark:text-slate-100"
              >
                {item.title}
              </Link>
              <p className="text-xs text-slate-500">
                Your: ${item.listingPrice} · Market avg: ${item.marketAveragePrice}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-medium ${
                item.priceDifferencePercent > 5
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                  : item.priceDifferencePercent < -5
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
              }`}
            >
              {item.priceDifferencePercent > 0 ? '+' : ''}
              {item.priceDifferencePercent}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
