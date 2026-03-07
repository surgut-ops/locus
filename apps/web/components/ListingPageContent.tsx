'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { BookingWidget } from './BookingWidget';
import { ListingAmenities } from './ListingAmenities';
import { ListingDescription } from './ListingDescription';
import { ListingGallery } from './ListingGallery';
import { ListingInfo } from './ListingInfo';
import { ListingMap } from './ListingMap';
import { ReputationBadges } from './TrustBadges';
import { ReviewsSection } from './ReviewsSection';
import { fetchListingById, fetchListingReviews } from '../services/listings.service';
import { fetchMarketInsight } from '../services/market.service';
import { getUserReputation } from '../services/reputation.service';
import { MarketInsightCard } from './MarketInsightCard';

type ListingPageContentProps = {
  listingId: string;
};

export function ListingPageContent({ listingId }: ListingPageContentProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchListingById>> | null>(null);
  const [hostReputation, setHostReputation] = useState<{ badges: string[]; reputationScore: number } | null>(null);
  const [marketInsight, setMarketInsight] = useState<Awaited<ReturnType<typeof fetchMarketInsight>> | null>(null);
  const [reviews, setReviews] = useState<
    Array<{
      id: string;
      rating: number;
      comment: string | null;
      createdAt: string;
      author?: {
        id: string;
        firstName: string;
        lastName: string;
        avatarUrl?: string | null;
      } | null;
    }>
  >([]);

  useEffect(() => {
    async function loadListing() {
      try {
        const [details, listingReviews] = await Promise.all([
          fetchListingById(listingId),
          fetchListingReviews(listingId),
        ]);
        setData(details);
        setReviews(listingReviews.items ?? []);

        if (details?.host?.id) {
          getUserReputation(details.host.id)
            .then((rep) => setHostReputation({ badges: rep.badges, reputationScore: rep.reputationScore }))
            .catch(() => setHostReputation(null));
        }
        fetchMarketInsight(listingId)
          .then(setMarketInsight)
          .catch(() => setMarketInsight(null));
      } finally {
        setLoading(false);
      }
    }

    void loadListing();
  }, [listingId]);

  const rating = useMemo(() => {
    if (reviews.length === 0) {
      return data?.reviewsSummary.rating ?? 0;
    }
    const sum = reviews.reduce((acc, item) => acc + item.rating, 0);
    return sum / reviews.length;
  }, [reviews, data?.reviewsSummary.rating]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-[260px] animate-pulse rounded-2xl bg-slate-200 md:h-[420px]" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">Listing not found.</div>;
  }

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <ListingGallery title={data.listing.title} images={data.images?.map((image) => ({ id: image.id, url: image.url })) ?? []} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <ListingInfo
            title={data.listing.title}
            city={data.listing.city}
            country={data.listing.country}
            rating={rating}
            reviewCount={reviews.length || data.reviewsSummary.reviewCount}
            guests={data.listing.maxGuests}
            rooms={data.listing.rooms ?? null}
            trustScore={data.listing.trustScore}
            host={data.host}
            hostReputation={hostReputation}
          />

          <ListingDescription description={data.listing.description} />
          {marketInsight && <MarketInsightCard data={marketInsight} />}
          <ListingAmenities amenities={data.amenities ?? []} />
          <ListingMap
            latitude={data.listing.latitude ?? null}
            longitude={data.listing.longitude ?? null}
            city={data.listing.city}
          />
          <ReviewsSection rating={rating} reviews={reviews} />
        </div>

        <motion.aside
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="md:sticky md:top-24 md:self-start"
        >
          <div className="hidden md:block">
            <BookingWidget
              listingId={data.listing.id}
              pricePerNight={data.listing.pricePerNight}
              currency={data.listing.currency}
              maxGuests={data.listing.maxGuests}
            />
          </div>
        </motion.aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
        <BookingWidget
          listingId={data.listing.id}
          pricePerNight={data.listing.pricePerNight}
          currency={data.listing.currency}
          maxGuests={data.listing.maxGuests}
        />
      </div>
    </div>
  );
}
