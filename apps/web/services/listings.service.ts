import { apiRequest } from '../lib/api';
import type { Listing } from '../types';

export type ListingDetailsResponse = {
  listing: {
    id: string;
    title: string;
    description: string;
    price: number | null;
    currency: string;
    type: string;
    city: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
    rooms: number | null;
    guests: number | null;
    hostId: string;
    status: string;
    trustScore?: number;
    createdAt: string;
    updatedAt: string;
  };
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    rating?: number;
    reviewCount?: number;
    trustScore?: number;
    reputationScore?: number;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    identityVerified?: boolean;
  } | null;
  images: Array<{ id: string; url: string; thumbnailUrl?: string | null }>;
  amenities: Array<{ id: string; name: string; icon?: string | null }>;
  reviews: Array<{
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
  }>;
};

export async function fetchListingById(id: string): Promise<{
  listing: Listing;
  images: Listing['images'];
  amenities: Listing['amenities'];
  host: Listing['host'];
  reviewsSummary: { rating: number; reviewCount: number };
}> {
  const response = await apiRequest<ListingDetailsResponse>(`/listings/${id}`, { cacheTtlMs: 60_000 });
  return {
    listing: {
      id: response.listing.id,
      title: response.listing.title,
      description: response.listing.description,
      city: response.listing.city,
      district: null,
      country: response.listing.country,
      address: '',
      type: response.listing.type,
      rating: averageRatingFromReviews(response.reviews),
      reviewCount: response.reviews.length,
      trustScore: response.listing.trustScore ?? 0,
      pricePerNight: response.listing.price,
      pricePerMonth: null,
      currency: response.listing.currency,
      rooms: response.listing.rooms,
      latitude: response.listing.latitude,
      longitude: response.listing.longitude,
      maxGuests: response.listing.guests,
      images: response.images.map((image, index) => ({
        id: image.id,
        url: image.url,
        position: index,
      })),
      amenities: response.amenities.map((amenity) => ({
        id: amenity.id,
        name: amenity.name,
        icon: amenity.icon ?? null,
        category: null,
      })),
      host: response.owner
        ? {
            id: response.owner.id,
            firstName: response.owner.firstName,
            lastName: response.owner.lastName,
            avatarUrl: response.owner.avatarUrl ?? null,
            rating: response.owner.rating ?? 0,
            reviewCount: response.owner.reviewCount ?? 0,
    trustScore: response.owner.trustScore ?? 0,
    reputationScore: response.owner.reputationScore ?? 0,
    emailVerified: response.owner.emailVerified ?? false,
    phoneVerified: response.owner.phoneVerified ?? false,
    identityVerified: response.owner.identityVerified ?? false,
  }
        : undefined,
    },
    images: response.images.map((image, index) => ({
      id: image.id,
      url: image.url,
      position: index,
    })),
    amenities: response.amenities.map((amenity) => ({
      id: amenity.id,
      name: amenity.name,
      icon: amenity.icon ?? null,
      category: null,
    })),
    host: response.owner
      ? {
          id: response.owner.id,
          firstName: response.owner.firstName,
          lastName: response.owner.lastName,
          avatarUrl: response.owner.avatarUrl ?? null,
          rating: response.owner.rating ?? 0,
          reviewCount: response.owner.reviewCount ?? 0,
    trustScore: response.owner.trustScore ?? 0,
    reputationScore: response.owner.reputationScore ?? 0,
    emailVerified: response.owner.emailVerified ?? false,
    phoneVerified: response.owner.phoneVerified ?? false,
    identityVerified: response.owner.identityVerified ?? false,
  }
      : undefined,
    reviewsSummary: {
      rating: averageRatingFromReviews(response.reviews),
      reviewCount: response.reviews.length,
    },
  };
}

export async function fetchListingReviews(listingId: string) {
  const response = await apiRequest<{
    items: Array<{
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
    }>;
    total: number;
    page: number;
    limit: number;
    pages: number;
  }>(`/listings/${listingId}/reviews?page=1&limit=10`, { cacheTtlMs: 30_000 });
  return response;
}

export async function searchListings(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  return apiRequest<Listing[]>(`/search?${query.toString()}`, { cacheTtlMs: 30_000 });
}

export async function getMyListings() {
  return apiRequest<
    Array<{
      id: string;
      title: string;
      city: string;
      country: string;
      status: string;
      pricePerNight: number | null;
      currency: string;
      images?: Array<{ id: string; url: string; thumbnailUrl?: string | null }>;
    }>
  >('/users/me/listings', { cacheTtlMs: 30_000 });
}

export type CreateListingPayload = {
  title: string;
  description: string;
  type: 'APARTMENT' | 'HOUSE' | 'STUDIO' | 'ROOM' | 'VILLA' | 'HOTEL';
  price: number;
  currency: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  rooms: number | null;
  guests: number | null;
};

export async function createListing(payload: CreateListingPayload) {
  return apiRequest<{
    id: string;
    ownerId: string;
    title: string;
    description: string;
    type: string;
    pricePerNight: number;
    currency: string;
    city: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
    rooms: number | null;
    maxGuests: number | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>('/listings', {
    method: 'POST',
    body: payload,
  });
}

export type PricingSuggestResponse = {
  currentPrice: number | null;
  averageMarketPrice: number;
  recommendedPrice: number;
};

export async function fetchPricingSuggestion(listingId: string): Promise<PricingSuggestResponse> {
  return apiRequest<PricingSuggestResponse>(
    `/pricing/suggest?listingId=${encodeURIComponent(listingId)}`,
    { cacheTtlMs: 0 },
  );
}

export async function updateListing(
  listingId: string,
  payload: {
    title?: string;
    description?: string;
    price?: number;
    rooms?: number | null;
    guests?: number | null;
    city?: string;
    coordinates?: { latitude: number; longitude: number };
  },
) {
  return apiRequest(`/listings/${listingId}`, {
    method: 'PUT',
    body: payload,
  });
}

function averageRatingFromReviews(
  reviews: Array<{
    rating: number;
  }>,
): number {
  if (reviews.length === 0) {
    return 0;
  }
  const sum = reviews.reduce((acc, item) => acc + item.rating, 0);
  return sum / reviews.length;
}
