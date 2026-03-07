import { UserActivityAction } from '@prisma/client';

export type RecommendationListing = {
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

export type TrackUserActivityInput = {
  userId: string;
  listingId?: string;
  action: UserActivityAction;
  metadata?: Record<string, unknown>;
};

export type RecommendationUserPreferences = {
  preferredCities: string[];
  preferredAmenities: string[];
  minPrice?: number;
  maxPrice?: number;
};

export class RecommendationsError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'RecommendationsError';
    this.statusCode = statusCode;
  }
}
