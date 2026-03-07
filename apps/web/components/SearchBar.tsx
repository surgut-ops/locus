'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { useRouter } from '../i18n/navigation';
import { Button, Input } from './ui';

const AI_SUGGESTIONS = [
  'квартира в Москве до 100$ с парковкой',
  'студия в Дубае',
  'дом с бассейном',
  'апартаменты в центре с WiFi',
];

const AI_SUGGESTIONS_EN = [
  'apartment in Moscow under $100 with parking',
  'studio in Dubai',
  'house with pool',
  'apartment in center with WiFi',
];

type SearchBarProps = {
  className?: string;
};

export function SearchBar({ className = '' }: SearchBarProps) {
  const t = useTranslations();
  const router = useRouter();
  const [mode, setMode] = useState<'classic' | 'ai' | 'travel'>('ai');
  const [aiQuery, setAiQuery] = useState('');
  const [city, setCity] = useState('');
  const [place, setPlace] = useState('');
  const [radiusKm, setRadiusKm] = useState('10');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('');

  const suggestions = t('ai_search_suggestions').includes('квартира') ? AI_SUGGESTIONS : AI_SUGGESTIONS_EN;

  const handleAiSubmit = useCallback(() => {
    const trimmed = aiQuery.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/search');
    }
  }, [aiQuery, router]);

  const handleClassicSubmit = useCallback(() => {
    const query = new URLSearchParams();
    if (city) query.set('city', city);
    if (checkIn) query.set('checkIn', checkIn);
    if (checkOut) query.set('checkOut', checkOut);
    if (guests) query.set('guests', guests);
    router.push(query.toString() ? `/search?${query.toString()}` : '/search');
  }, [city, checkIn, checkOut, guests, router]);

  const handleTravelSubmit = useCallback(() => {
    const trimmed = place.trim();
    if (trimmed) {
      const query = new URLSearchParams();
      query.set('mode', 'travel');
      query.set('place', trimmed);
      if (radiusKm && Number(radiusKm) > 0) query.set('radiusKm', radiusKm);
      router.push(`/search?${query.toString()}`);
    }
  }, [place, radiusKm, router]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setAiQuery(suggestion);
    },
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`rounded-2xl border border-white/30 bg-white/95 p-3 shadow-xl backdrop-blur ${className}`}
    >
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('ai')}
          className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
            mode === 'ai'
              ? 'bg-pink-600 text-white'
              : 'bg-white/80 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t('ai_search_mode')}
        </button>
        <button
          type="button"
          onClick={() => setMode('classic')}
          className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
            mode === 'classic'
              ? 'bg-pink-600 text-white'
              : 'bg-white/80 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t('classic_search_mode')}
        </button>
      </div>

      {mode === 'ai' ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder={t('ai_search_placeholder')}
              value={aiQuery}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setAiQuery(event.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAiSubmit();
                }
              }}
              className="flex-1 min-h-[48px] text-base"
            />
            <Button onClick={handleAiSubmit} className="min-h-[48px] shrink-0">
              {t('search_button')}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600 transition hover:border-pink-300 hover:bg-pink-50 hover:text-pink-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : mode === 'travel' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder={t('travel_place_placeholder')}
              value={place}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlace(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTravelSubmit()}
              className="flex-1 min-w-[200px] min-h-[48px]"
            />
            <Input
              type="number"
              min={1}
              max={50}
              placeholder="km"
              value={radiusKm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRadiusKm(e.target.value)}
              className="w-20 min-h-[48px]"
            />
            <Button onClick={handleTravelSubmit} className="min-h-[48px] shrink-0">
              {t('search_button')}
            </Button>
          </div>
          <p className="text-xs text-slate-500">{t('travel_place_hint')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <Input
              placeholder={t('search_city_placeholder')}
              value={city}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setCity(event.target.value)
              }
            />
            <Input
              type="date"
              value={checkIn}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setCheckIn(event.target.value)
              }
            />
            <Input
              type="date"
              value={checkOut}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setCheckOut(event.target.value)
              }
            />
            <Input
              placeholder={t('guests')}
              type="number"
              min={1}
              value={guests}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setGuests(event.target.value)
              }
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={handleClassicSubmit}>{t('search_button')}</Button>
          </div>
        </>
      )}
    </motion.div>
  );
}
