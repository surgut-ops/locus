import type { ListingType } from '@prisma/client';

export type BehaviorEventType =
  | 'listing_view'
  | 'listing_favorite'
  | 'booking_created'
  | 'search_performed';

export type SearchFilters = {
  city?: string;
  district?: string;
  country?: string;
  listingType?: ListingType;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  amenities?: string[];
};

export type TrackViewPayload = {
  listingId: string;
};

export type TrackSearchPayload = {
  query: string;
  filters?: SearchFilters;
};

export type AssistedSearchPayload = {
  prompt: string;
};

export type UserBehaviorSignals = {
  views: string[];
  favorites: string[];
  searches: string[];
  bookings: string[];
};

export type RankingInputListing = {
  id: string;
  title: string;
  description: string;
  city: string;
  district: string | null;
  country: string;
  type: ListingType;
  rating: number;
  reviewCount: number;
  pricePerNight: number | null;
  pricePerMonth: number | null;
  views: number;
  bookingsCount: number;
};

export type RankedListing = RankingInputListing & {
  score: number;
};

export class AIError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AIError';
    this.statusCode = statusCode;
  }
}
