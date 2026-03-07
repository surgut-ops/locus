'use client';

import { motion } from 'framer-motion';
import type { HTMLAttributes, PropsWithChildren } from 'react';

type BadgeProps = PropsWithChildren<
  HTMLAttributes<HTMLSpanElement> & {
    variant?: 'default' | 'success' | 'warning' | 'error';
  }
>;

export function Badge({ children, className = '', variant = 'default', ...props }: BadgeProps) {
  const variantClass =
    variant === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      : variant === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
        : variant === 'error'
          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400'
          : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300';

  return (
    <motion.span
      whileHover={{ scale: 1.03 }}
      {...props}
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${variantClass} ${className}`}
    >
      {children}
    </motion.span>
  );
}
