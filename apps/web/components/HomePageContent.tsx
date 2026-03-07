'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '../i18n/navigation';
import { useHydrateAuth } from '../hooks/useHydrateAuth';
import { useAppStore } from '../store/app.store';
import { PageSection } from '../layouts/PageSection';
import {
  fetchAIRecommendedListings,
  fetchMatchRecommendations,
  fetchPopularListings,
  fetchTrendingListings,
  type ListingSearchItem,
  type MatchRecommendationItem,
} from '../services/api';
import { ListingsGrid } from './ListingsGrid';
import { MatchListingsGrid } from './MatchListingsGrid';
import { SearchBar } from './SearchBar';

const POPULAR_CITIES = ['Dubai', 'Bangkok', 'London', 'Paris', 'New York', 'Istanbul'];

export function HomePageContent() {
  const t = useTranslations();
  useHydrateAuth();
  const isAuthenticated = useAppStore((s) => s.auth.isAuthenticated);
  const [loading, setLoading] = useState(true);
  const [trending, setTrending] = useState<ListingSearchItem[]>([]);
  const [recommended, setRecommended] = useState<ListingSearchItem[]>([]);
  const [popular, setPopular] = useState<ListingSearchItem[]>([]);
  const [matchItems, setMatchItems] = useState<MatchRecommendationItem[] | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const [trendingItems, popularItems, recommendedItems] = await Promise.all([
          fetchTrendingListings(),
          fetchPopularListings(),
          fetchAIRecommendedListings(),
        ]);
        setTrending(trendingItems);
        setPopular(popularItems);
        setRecommended(recommendedItems);
      } finally {
        setLoading(false);
      }
    }

    void loadHomeData();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setMatchItems(null);
      return;
    }
    async function loadMatchData() {
      setMatchLoading(true);
      try {
        const items = await fetchMatchRecommendations(8);
        setMatchItems(items ?? []);
      } finally {
        setMatchLoading(false);
      }
    }

    void loadMatchData();
  }, [isAuthenticated]);

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-gradient-to-r from-pink-600 via-rose-500 to-orange-400 px-4 py-10 text-white md:px-10 md:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-bold md:text-5xl">{t('hero_title')}</h1>
          <p className="mt-3 text-sm text-pink-100 md:text-base">{t('hero_subtitle')}</p>
          <SearchBar className="mx-auto mt-6 max-w-4xl" />
        </div>
      </section>

      {isAuthenticated && (
        <PageSection title={t('recommended_for_you')} subtitle={t('recommended_for_you_subtitle')}>
          <MatchListingsGrid
            items={matchItems ?? []}
            loading={matchLoading}
          />
        </PageSection>
      )}

      <PageSection title={t('trending')} subtitle={t('trending_subtitle')}>
        <ListingsGrid listings={trending} loading={loading} />
      </PageSection>

      <PageSection title={t('popular_cities')} subtitle={t('popular_cities_subtitle')}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {POPULAR_CITIES.map((city) => (
            <Link
              key={city}
              href={`/search?city=${encodeURIComponent(city)}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm font-medium text-slate-700 transition hover:border-pink-300 hover:bg-pink-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:bg-slate-700"
            >
              {city}
            </Link>
          ))}
        </div>
      </PageSection>

      <PageSection title={t('ai_recommendations')} subtitle={t('ai_recommendations_subtitle')}>
        <ListingsGrid listings={recommended.length > 0 ? recommended : popular} loading={loading} />
      </PageSection>
    </div>
  );
}
