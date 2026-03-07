import { motion } from 'framer-motion';

import { ReputationBadges, TrustedListingBadge, VerifiedHostBadge } from './TrustBadges';

type ListingInfoProps = {
  title: string;
  city: string;
  country: string;
  rating: number;
  reviewCount: number;
  guests: number | null;
  rooms: number | null;
  trustScore?: number;
  host?: {
    trustScore?: number;
    reputationScore?: number;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    identityVerified?: boolean;
  };
  hostReputation?: { badges: string[]; reputationScore: number } | null;
};

export function ListingInfo({
  title,
  city,
  country,
  rating,
  reviewCount,
  guests,
  rooms,
  trustScore,
  host,
  hostReputation,
}: ListingInfoProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-2"
    >
      <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <TrustedListingBadge trustScore={trustScore} />
        {host && (
          <VerifiedHostBadge
            trustScore={host.trustScore}
            emailVerified={host.emailVerified}
            phoneVerified={host.phoneVerified}
            identityVerified={host.identityVerified}
          />
        )}
        {hostReputation && hostReputation.badges.length > 0 && (
          <ReputationBadges badges={hostReputation.badges} />
        )}
      </div>
      <p className="text-sm text-slate-600">
        {city}, {country}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
        <span>★ {rating.toFixed(1)}</span>
        <span>{reviewCount} reviews</span>
        <span>{guests ?? 0} guests</span>
        <span>{rooms ?? 0} rooms</span>
      </div>
    </motion.section>
  );
}
