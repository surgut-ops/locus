import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
};

export function Button({ children, className = '', variant = 'primary', ...props }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2';
  const styles =
    variant === 'primary'
      ? 'bg-pink-600 text-white hover:bg-pink-700 focus:ring-pink-500'
      : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 focus:ring-slate-400';

  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}
