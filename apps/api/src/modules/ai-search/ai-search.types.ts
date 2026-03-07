export type AiSearchQueryBody = {
  query: string;
};

export type AiSearchParsedFilters = {
  city?: string;
  priceMax?: number;
  rooms?: number;
  guests?: number;
  amenities?: string[];
};

export type AiSearchResponse = {
  listings: Array<{
    id: string;
    title: string;
    description: string;
    city: string;
    country: string;
    price: number | null;
    rooms: number | null;
    guests: number | null;
    latitude: number | null;
    longitude: number | null;
    rating: number;
    amenities: string[];
    images: Array<{ id: string; url: string; thumbnailUrl: string | null }>;
  }>;
  total: number;
  page: number;
  limit: number;
  filtersUsed: AiSearchParsedFilters;
};

export class AiSearchError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AiSearchError';
    this.statusCode = statusCode;
  }
}
