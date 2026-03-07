'use client';

import Image from 'next/image';

import { Link } from '../i18n/navigation';
import { motion } from 'framer-motion';

type UserListingCardProps = {
  id: string;
  title: string;
  city: string;
  country: string;
  status: string;
  pricePerNight: number | null;
  currency: string;
  coverImageUrl?: string | null;
};

export function UserListingCard({
  id,
  title,
  city,
  country,
  status,
  pricePerNight,
  currency,
  coverImageUrl,
}: UserListingCardProps) {
  return (
    <motion.article
      whileHover={{ y: -2 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
    >
      <div className="relative h-40 w-full bg-slate-100">
        {coverImageUrl ? (
          <Image src={coverImageUrl} alt={title} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">No photo</div>
        )}
      </div>
      <div className="space-y-1 p-4">
        <h3 className="line-clamp-1 text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">
          {city}, {country}
        </p>
        <p className="text-sm text-slate-700">
          {pricePerNight ? `${pricePerNight} ${currency} / night` : 'Price not set'}
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase text-slate-700">
            {status}
          </span>
          <Link href={`/listings/${id}`} className="text-sm font-medium text-slate-900 underline">
            Open
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
