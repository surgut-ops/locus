'use client';

import { usePathname } from 'next/navigation';

import { Link } from '../i18n/navigation';
import { useTranslations } from 'next-intl';

const NAV_ITEMS = [
  { href: '/', icon: HomeIcon, labelKey: 'home' as const },
  { href: '/search', icon: SearchIcon, labelKey: 'search' as const },
  { href: '/dashboard/bookings', icon: BookingsIcon, labelKey: 'bookings' as const },
  { href: '/dashboard/profile', icon: ProfileIcon, labelKey: 'profile' as const },
] as const;

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg
      className="h-6 w-6"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function SearchIcon({ active }: { active?: boolean }) {
  return (
    <svg
      className="h-6 w-6"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function BookingsIcon({ active }: { active?: boolean }) {
  return (
    <svg
      className="h-6 w-6"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function ProfileIcon({ active }: { active?: boolean }) {
  return (
    <svg
      className="h-6 w-6"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur safe-area-pb md:hidden"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[56px] min-w-[56px] flex-col items-center justify-center gap-0.5 px-4 py-2 text-xs transition active:bg-slate-100 ${
                isActive ? 'text-pink-600' : 'text-slate-600'
              }`}
            >
              <Icon active={isActive} />
              <span>{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
