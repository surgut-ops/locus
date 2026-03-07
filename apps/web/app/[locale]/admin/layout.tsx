'use client';

import type { ReactNode } from 'react';

import { AdminGuard } from '../../../components/AdminGuard';
import { Link, usePathname } from '../../../i18n/navigation';

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/listings', label: 'Listings' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/growth', label: 'Growth' },
];

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  return (
    <AdminGuard>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <nav className="flex flex-wrap gap-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg border px-3 py-2 text-sm ${
                pathname === item.href
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white hover:bg-slate-50'
              }`}
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
