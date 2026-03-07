'use client';

import { motion } from 'framer-motion';

type HostAIInsightsProps = {
  aiInsight: string;
};

export function HostAIInsights({ aiInsight }: HostAIInsightsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5 dark:border-violet-800/50 dark:from-violet-900/20 dark:to-purple-900/20"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 text-white">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </span>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          AI suggestions
        </h3>
      </div>
      <p className="mt-3 text-slate-700 dark:text-slate-300">{aiInsight}</p>
    </motion.div>
  );
}
