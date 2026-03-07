'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { AdminGuard } from '../../components/AdminGuard';

type AdminLayoutProps = {
  children: ReactNode;
};

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/listings', label: 'Listings' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/growth', label: 'Growth' },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminGuard>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <nav className="flex flex-wrap gap-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </AdminGuard>
  );
}
