'use client';

import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { usePathname, useRouter } from '../i18n/navigation';

const OPTIONS = ['ru', 'en'] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
