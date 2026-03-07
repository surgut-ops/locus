import type { ListingType } from '@prisma/client';

export type MatchUserPreferences = {
  favoriteCities: string[];
  priceMin?: number;
  priceMax?: number;
  propertyTypes: ListingType[];
  amenities: string[];
};

export type MatchListingItem = {
  id: string;
  title: string;
  description: string;
  city: string;
  district: string | null;
  country: string;
  address: string;
  type: string;
  rating: number;
  reviewCount: number;
  pricePerNight: number | null;
  pricePerMonth: number | null;
  currency: string;
  maxGuests: number | null;
  images: Array<{ id: string; url: string; thumbnailUrl: string | null }>;
  amenities: Array<{ id: string; name: string; icon: string | null; category: string | null }>;
};

export type MatchRecommendationItem = {
  listing: MatchListingItem;
  matchScore: number;
  aiInsight: string;
};

export type MatchRecommendationsResponse = {
  listings: MatchRecommendationItem[];
};

export class MatchError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'MatchError';
    this.statusCode = statusCode;
  }
}
