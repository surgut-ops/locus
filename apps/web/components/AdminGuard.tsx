'use client';

import { Link } from '../i18n/navigation';
import type { ReactNode } from 'react';

import { useHydrateAuth } from '../hooks/useHydrateAuth';
import { useAppStore } from '../store/app.store';

type AdminGuardProps = {
  children: ReactNode;
};

export function AdminGuard({ children }: AdminGuardProps) {
  useHydrateAuth();
  const auth = useAppStore((state) => state.auth);

  const isAdmin = auth.role === 'ADMIN';

  if (!auth.isAuthenticated) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
        Login required. Go to <Link href="/" className="text-pink-600">homepage</Link>.
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Access denied. This page is available only for ADMIN role.
      </div>
    );
  }

  return <>{children}</>;
}
