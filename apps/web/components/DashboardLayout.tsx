'use client';

import type { ReactNode } from 'react';

import { useRequireAuth } from '../hooks/useRequireAuth';
import { DashboardSidebar } from './DashboardSidebar';

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthorized } = useRequireAuth();

  if (!isAuthorized) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-200" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
          <div className="h-56 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
        <DashboardSidebar />
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
