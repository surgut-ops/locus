'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { UserListingCard } from '../../../../components/UserListingCard';
import { getMyListings } from '../../../../services/listings.service';
import { Link } from '../../../../i18n/navigation';

type MyListingItem = {
  id: string;
  title: string;
  city: string;
  country: string;
  status: string;
  pricePerNight: number | null;
  currency: string;
  images?: Array<{ id: string; url: string; thumbnailUrl?: string | null }>;
};

export default function DashboardListingsPage() {
  const [items, setItems] = useState<MyListingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMyListings();
        setItems((data ?? []) as MyListingItem[]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="h-72 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-4 flex justify-end gap-2">
        <Link
          href="/dashboard/listings/create-ai"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          Create with AI
        </Link>
        <Link
          href="/dashboard/listings/create"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Create listing
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-600">You do not have listings yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((listing) => (
            <UserListingCard
              key={listing.id}
              id={listing.id}
              title={listing.title}
              city={listing.city}
              country={listing.country}
              status={listing.status}
              pricePerNight={listing.pricePerNight}
              currency={listing.currency}
              coverImageUrl={listing.images?.[0]?.thumbnailUrl ?? listing.images?.[0]?.url ?? null}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
