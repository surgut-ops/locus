export type SearchSortBy = 'price' | 'rating' | 'newest';
export type SearchSortOrder = 'asc' | 'desc';

export type SearchQueryDto = {
  city?: string;
  priceMin?: number;
  priceMax?: number;
  rooms?: number;
  guests?: number;
  amenities?: string[];
  latitude?: number;
  longitude?: number;
  radius?: number;
  page: number;
  limit: number;
  sortBy?: SearchSortBy;
  sortOrder?: SearchSortOrder;
};

export type SearchListingDocument = {
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
  status: string;
  createdAt: string;
  _geo?: { lat: number; lng: number };
};

export type SearchResultItem = {
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
  trustScore?: number;
  amenities: string[];
  images: Array<{ id: string; url: string; thumbnailUrl: string | null }>;
};

export type SearchResponse = {
  listings: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
};

export class SearchError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'SearchError';
    this.statusCode = statusCode;
  }
}
