'use client';

import type { HTMLAttributes } from 'react';

type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
};

export function Avatar({ name, src, size = 'md', className = '', ...props }: AvatarProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const sizeClass =
    size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-xs';

  return (
    <div
      {...props}
      className={`inline-flex items-center justify-center overflow-hidden rounded-full bg-slate-200 font-semibold text-slate-700 transition-transform hover:scale-105 dark:bg-slate-600 dark:text-slate-200 ${sizeClass} ${className}`}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials || 'U'
      )}
    </div>
  );
}
