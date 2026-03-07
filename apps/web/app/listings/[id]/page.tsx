import type { Metadata } from 'next';

import { ListingPageContent } from '../../../components/ListingPageContent';

type ListingPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Listing ${id} - LOCUS`,
    description: 'View listing photos, amenities, map, reviews and book your stay on LOCUS.',
  };
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  return <ListingPageContent listingId={id} />;
}
