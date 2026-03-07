'use client';

const TRUST_THRESHOLD = 50;

type VerifiedHostBadgeProps = {
  trustScore?: number;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  identityVerified?: boolean;
  className?: string;
};

export function VerifiedHostBadge({
  trustScore = 0,
  emailVerified = false,
  phoneVerified = false,
  identityVerified = false,
  className = '',
}: VerifiedHostBadgeProps) {
  const isVerified =
    trustScore >= TRUST_THRESHOLD ||
    (emailVerified && phoneVerified) ||
    identityVerified;

  if (!isVerified) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ${className}`}
      title="Verified Host"
    >
      <svg
        className="h-3.5 w-3.5"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
      Verified Host
    </span>
  );
}

type TrustedListingBadgeProps = {
  trustScore?: number;
  className?: string;
};

export function TrustedListingBadge({ trustScore = 0, className = '' }: TrustedListingBadgeProps) {
  if (trustScore < TRUST_THRESHOLD) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800 ${className}`}
      title="Trusted Listing"
    >
      <svg
        className="h-3.5 w-3.5"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
      Trusted Listing
    </span>
  );
}

type ReputationBadgesProps = {
  badges: string[];
  className?: string;
};

const BADGE_STYLES: Record<string, string> = {
  'Top Host': 'bg-amber-100 text-amber-800',
  'Reliable Guest': 'bg-violet-100 text-violet-800',
  'Super Listing': 'bg-rose-100 text-rose-800',
};

export function ReputationBadges({ badges, className = '' }: ReputationBadgesProps) {
  if (!badges || badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((badge) => (
        <span
          key={badge}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            BADGE_STYLES[badge] ?? 'bg-slate-100 text-slate-800'
          }`}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
          {badge}
        </span>
      ))}
    </div>
  );
}
