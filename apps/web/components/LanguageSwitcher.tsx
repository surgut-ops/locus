'use client';

import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { usePathname, useRouter } from '../i18n/navigation';

const OPTIONS = ['ru', 'en'] as const;

function LanguageSwitcherInner() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  useSearchParams(); // preserve in tree for router.replace

  function onChange(nextLocale: (typeof OPTIONS)[number]) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-md px-2 py-1 text-xs font-medium uppercase transition ${
            option === locale ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function LanguageSwitcher() {
  return (
    <Suspense fallback={<div className="h-8 w-16 animate-pulse rounded-lg bg-slate-100" />}>
      <LanguageSwitcherInner />
    </Suspense>
  );
}
