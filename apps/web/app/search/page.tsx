import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SearchPageContent } from '../../components/SearchPageContent';

export const metadata: Metadata = {
  title: 'Search Properties with Map - LOCUS',
  description: 'Search listings by filters and explore homes directly on an interactive map.',
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-80 animate-pulse rounded-2xl bg-slate-100" />}>
      <SearchPageContent />
    </Suspense>
  );
}
