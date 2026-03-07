'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useRouter } from '../i18n/navigation';
import { Button, Input } from './ui';

type SearchModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SearchModal({ open, onClose }: SearchModalProps) {
  const t = useTranslations();
  const router = useRouter();

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const city = (form.elements.namedItem('city') as HTMLInputElement)?.value ?? '';
      const checkIn = (form.elements.namedItem('checkIn') as HTMLInputElement)?.value ?? '';
      const checkOut = (form.elements.namedItem('checkOut') as HTMLInputElement)?.value ?? '';
      const guests = (form.elements.namedItem('guests') as HTMLInputElement)?.value ?? '';

      const query = new URLSearchParams();
      if (city) query.set('city', city);
      if (checkIn) query.set('checkIn', checkIn);
      if (checkOut) query.set('checkOut', checkOut);
      if (guests) query.set('guests', guests);
      router.push(query.toString() ? `/search?${query.toString()}` : '/search');
      onClose();
    },
    [router, onClose],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex flex-col bg-white md:hidden"
        >
          <div className="flex min-h-14 items-center justify-between border-b border-slate-200 px-4">
            <h2 className="text-lg font-semibold text-slate-900">{t('search')}</h2>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded-xl p-2 text-slate-600 transition active:bg-slate-100"
              aria-label="Close search"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-auto p-4">
            <div>
              <label htmlFor="search-city" className="mb-1 block text-sm font-medium text-slate-700">
                {t('city')}
              </label>
              <Input
                id="search-city"
                name="city"
                placeholder={t('search_city_placeholder')}
                className="min-h-[48px] text-base"
              />
            </div>
            <div>
              <label htmlFor="search-checkin" className="mb-1 block text-sm font-medium text-slate-700">
                Check-in
              </label>
              <Input
                id="search-checkin"
                name="checkIn"
                type="date"
                className="min-h-[48px] text-base"
              />
            </div>
            <div>
              <label htmlFor="search-checkout" className="mb-1 block text-sm font-medium text-slate-700">
                Check-out
              </label>
              <Input
                id="search-checkout"
                name="checkOut"
                type="date"
                className="min-h-[48px] text-base"
              />
            </div>
            <div>
              <label htmlFor="search-guests" className="mb-1 block text-sm font-medium text-slate-700">
                {t('guests')}
              </label>
              <Input
                id="search-guests"
                name="guests"
                type="number"
                min={1}
                placeholder={t('guests')}
                className="min-h-[48px] text-base"
              />
            </div>
            <div className="mt-auto pt-4">
              <Button type="submit" className="min-h-[48px] w-full text-base">
                {t('search_button')}
              </Button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
