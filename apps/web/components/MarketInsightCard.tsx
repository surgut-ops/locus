'use client';

import { motion } from 'framer-motion';

import { Card } from './ui';
import type { MarketInsight } from '../services/market.service';

type MarketInsightCardProps = {
  data: MarketInsight;
};

function ScoreBar({ value, label }: { value: number; label: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const color =
    pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600';
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className="font-medium text-slate-900 dark:text-slate-100">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

export function MarketInsightCard({ data }: MarketInsightCardProps) {
  const priceStatus =
    data.priceDifferencePercent > 5
      ? 'above'
      : data.priceDifferencePercent < -5
        ? 'below'
        : 'fair';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
          Market Insight
        </h3>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Средняя цена (город)</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                ${data.averagePrice.toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Цена объявления</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                ${data.listingPrice.toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Разница с рынком</p>
              <p
                className={`text-lg font-semibold ${
                  priceStatus === 'above'
                    ? 'text-amber-600 dark:text-amber-400'
                    : priceStatus === 'below'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {data.priceDifference >= 0 ? '+' : ''}${data.priceDifference.toFixed(0)} (
                {data.priceDifferencePercent >= 0 ? '+' : ''}
                {data.priceDifferencePercent}%)
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <ScoreBar value={data.demandScore} label="Demand Score" />
            <ScoreBar value={data.marketScore} label="Market Score (район)" />
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <p className="text-sm text-slate-700 dark:text-slate-300">{data.aiInsight}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
