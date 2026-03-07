'use client';

import type { HTMLAttributes, PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 ${className}`}
    >
      {children}
    </div>
  );
}
