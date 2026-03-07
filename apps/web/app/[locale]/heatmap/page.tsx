'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { PageSection } from '../../../layouts/PageSection';

const CityHeatmap = dynamic(
  () => import('../../../components/CityHeatmap').then((m) => m.CityHeatmap),
  { ssr: false, loading: () => <div className="min-h-[400px] animate-pulse rounded-2xl bg-slate-100" /> },
);

const POPULAR_CITIES = ['Dubai', 'Moscow', 'London', 'Paris', 'Bangkok', 'Istanbul'];

function HeatmapContent() {
  const params = useSearchParams();
  const cityFromUrl = params.get('city') ?? '';
  const [city, setCity] = useState(cityFromUrl || 'Dubai');

  return (
    <div className="space-y-6">
      <PageSection
        title="District Heatmap"
        subtitle="View demand and average prices by district. Hover over areas for details."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {POPULAR_CITIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCity(c)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                city === c
                  ? 'bg-pink-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="min-h-[400px]">
          <CityHeatmap city={city} className="min-h-[400px]" />
        </div>
      </PageSection>
    </div>
  );
}

export default function HeatmapPage() {
  return (
    <Suspense fallback={<div className="min-h-[400px] animate-pulse rounded-2xl bg-slate-100" />}>
      <HeatmapContent />
    </Suspense>
  );
}
