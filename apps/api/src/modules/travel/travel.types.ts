export type TravelSearchPayload = {
  place: string;
  radiusKm?: number;
  limit?: number;
};

export type TravelListingItem = {
  id: string;
  title: string;
  description: string;
  city: string;
  country: string;
  price: number | null;
  rating: number;
  trustScore?: number;
  amenities: string[];
  images: Array<{ id: string; url: string; thumbnailUrl: string | null }>;
  latitude: number;
  longitude: number;
};

export type TravelSearchResultItem = {
  listing: TravelListingItem;
  distance: number;
  distanceScore: number;
  travelTime: number;
};

export type TravelSearchResponse = {
  place: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  results: TravelSearchResultItem[];
};

export class TravelError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'TravelError';
    this.statusCode = statusCode;
  }
}
