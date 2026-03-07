import type { Metadata } from 'next';

import { SearchPageContent } from '../../components/SearchPageContent';

export const metadata: Metadata = {
  title: 'Search Properties with Map - LOCUS',
  description: 'Search listings by filters and explore homes directly on an interactive map.',
};

export default function SearchPage() {
  return <SearchPageContent />;
}
