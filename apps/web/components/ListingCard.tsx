'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Link } from '../i18n/navigation';

import { cardHover, imageScale } from '../animations/motion';
import type { ListingSearchItem } from '../services/api';
import { TrustedListingBadge } from './TrustBadges';
import { Badge, Card } from './ui';

type ListingCardProps = {
  listing: ListingSearchItem;
  showAiMatchBadge?: boolean;
  matchScore?: number;
};

export function ListingCard({
  listing,
  showAiMatchBadge = false,
  matchScore,
}: ListingCardProps) {
  const imageUrl =
    listing.images[0]?.thumbnailUrl ??
    listing.images[0]?.url ??
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22640%22 height=%22420%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23f1f5f9%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22 font-family=%22Arial%22 font-size=%2230%22%3ELOCUS%3C/text%3E%3C/svg%3E';
  const price = listing.price ?? 0;
  const amenities = listing.amenities.slice(0, 3);
  const location = `${listing.city}, ${listing.country}`;

  return (
    <Link href={`/listings/${listing.id}`} className="block w-full">
      <motion.div
        initial="rest"
        whileHover="hover"
        variants={cardHover}
        className="w-full cursor-pointer"
      >
        <Card className="overflow-hidden shadow-sm transition-shadow duration-300 hover:shadow-xl dark:shadow-slate-900/50 dark:hover:shadow-slate-900/70">
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            {showAiMatchBadge && (
              <span className="absolute left-3 top-3 z-10 rounded-full border border-violet-200 bg-violet-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur dark:border-violet-700 dark:bg-violet-600/90">
                AI Match {matchScore != null ? `${matchScore}%` : ''}
              </span>
            )}
            <motion.div variants={imageScale} className="h-full w-full">
              <Image
                src={imageUrl}
                alt={listing.title}
                fill
                className="object-cover"
                loading="lazy"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                unoptimized={imageUrl.startsWith('data:')}
              />
            </motion.div>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="line-clamp-1 flex-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                {listing.title}
              </h3>
              <TrustedListingBadge trustScore={listing.trustScore} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{location}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                ${price}
                <span className="font-normal text-slate-500 dark:text-slate-400"> / night</span>
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <span className="text-amber-500">★</span>
                {listing.rating.toFixed(1)}
              </span>
            </div>
            {amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {amenities.map((amenity) => (
                  <Badge key={amenity}>{amenity}</Badge>
                ))}
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </Link>
  );
}
