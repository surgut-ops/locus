'use client';

import { Link, usePathname } from '../i18n/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';

const BASE_ITEMS = [
  { href: '/dashboard/profile', label: 'Profile' },
  { href: '/dashboard/bookings', label: 'My bookings' },
  { href: '/dashboard/listings', label: 'My listings' },
  { href: '/dashboard/referrals', label: 'Referrals' },
  { href: '/dashboard/messages', label: 'Messages' },
  { href: '/dashboard/notifications', label: 'Notifications' },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role ?? 'USER');
  const isHost = role === 'HOST' || role === 'ADMIN' || role === 'MODERATOR';
  const ITEMS = isHost
    ? [{ href: '/dashboard/host', label: 'Host analytics' }, ...BASE_ITEMS]
    : BASE_ITEMS;

  return (
    <motion.aside
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-slate-200 bg-white p-3"
    >
      <nav className="space-y-1">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-3 py-2 text-sm transition ${
                active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </motion.aside>
  );
}
