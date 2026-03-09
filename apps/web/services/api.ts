import { apiRequest, API_BASE_URL } from '../lib/api';

export type ListingSearchItem = {
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
};

export type MapListingItem = {
  id: string;
  title: string;
  price: number | null;
  latitude: number;
  longitude: number;
  image: string | null;
};

type SearchResponse = {
  listings: ListingSearchItem[];
  total: number;
  page: number;
  limit: number;
};

type SearchParams = {
  city?: string;
  priceMin?: string | number;
  priceMax?: string | number;
  rooms?: string | number;
  guests?: string | number;
  page?: string | number;
  limit?: string | number;
};

type MapBoundsParams = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export async function searchListings(params: SearchParams): Promise<SearchResponse> {
  const query = new URLSearchParams();
  appendQuery(query, 'city', params.city);
  appendQuery(query, 'priceMin', params.priceMin);
  appendQuery(query, 'priceMax', params.priceMax);
  appendQuery(query, 'rooms', params.rooms);
  appendQuery(query, 'guests', params.guests);
  appendQuery(query, 'page', params.page);
  appendQuery(query, 'limit', params.limit);

  const url = `${API_BASE_URL}/search${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Search request failed (${response.status})`);
  }

  return (await response.json()) as SearchResponse;
}

export async function fetchPopularListings(): Promise<ListingSearchItem[]> {
  const response = await searchListings({ page: 1, limit: 8 });
  return response.listings;
}

export async function fetchTrendingListings(): Promise<ListingSearchItem[]> {
  const response = await searchListings({ page: 1, limit: 8 });
  return response.listings;
}

export async function fetchAIRecommendedListings(): Promise<ListingSearchItem[]> {
  const response = await apiRequest<
    Array<{
      id: string;
      title: string;
      description: string;
      city: string;
      country: string;
      rating: number;
      pricePerNight: number | null;
      amenities: Array<{ name: string }>;
      images: Array<{ id: string; url: string; thumbnailUrl: string | null }>;
    }>
  >('/recommendations', { cacheTtlMs: 5 * 60_000 });
  return response.slice(0, 8).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    city: item.city,
    country: item.country,
    price: item.pricePerNight,
    rating: item.rating,
    amenities: item.amenities.map((amenity) => amenity.name),
    images: item.images,
  }));
}

export type MatchRecommendationItem = {
  listing: ListingSearchItem;
  matchScore: number;
  aiInsight: string;
};

type MatchApiItem = {
  listing: {
    id: string;
    title: string;
    description: string;
    city: string;
    country: string;
    rating: number;
    pricePerNight: number | null;
    amenities: Array<{ name: string }>;
    images: Array<{ id: string; url: string; thumbnailUrl: string | null }>;
  };
  matchScore: number;
  aiInsight: string;
};

export async function fetchMatchRecommendations(
  limit = 8,
): Promise<MatchRecommendationItem[] | null> {
  try {
    const res = await apiRequest<{ listings: MatchApiItem[] }>(
      `/match/recommendations?limit=${limit}`,
      { cacheTtlMs: 5 * 60_000 },
    );
    return res.listings.map((item) => ({
      listing: {
        id: item.listing.id,
        title: item.listing.title,
        description: item.listing.description,
        city: item.listing.city,
        country: item.listing.country,
        price: item.listing.pricePerNight,
        rating: item.listing.rating,
        amenities: item.listing.amenities.map((a) => a.name),
        images: item.listing.images,
      },
      matchScore: item.matchScore,
      aiInsight: item.aiInsight,
    }));
  } catch {
    return null;
  }
}

export type AiSearchResponse = {
  listings: ListingSearchItem[];
  total: number;
  page: number;
  limit: number;
  filtersUsed: {
    city?: string;
    priceMax?: number;
    rooms?: number;
    guests?: number;
    amenities?: string[];
  };
};

export async function aiSearch(query: string): Promise<AiSearchResponse> {
  const response = await fetch(`${API_BASE_URL}/ai-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query.trim() }),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`AI search failed (${response.status})`);
  }
  return response.json() as Promise<AiSearchResponse>;
}

export type HeatmapDistrictItem = {
  district: string;
  averagePrice: number;
  listingCount: number;
  demandScore: number;
  heatmapScore: number;
  latitude: number | null;
  longitude: number | null;
};

export type HeatmapCityResponse = {
  city: string;
  districts: HeatmapDistrictItem[];
};

export async function fetchHeatmapByCity(city: string): Promise<HeatmapCityResponse> {
  const response = await fetch(
    `${API_BASE_URL}/heatmap/city/${encodeURIComponent(city)}`,
    { cache: 'no-store' },
  );
  if (!response.ok) {
    throw new Error(`Heatmap request failed (${response.status})`);
  }
  return response.json() as Promise<HeatmapCityResponse>;
}

export type TravelSearchResultItem = {
  listing: ListingSearchItem & { latitude: number; longitude: number };
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

export type HostDashboardData = {
  totalRevenue: number;
  monthlyRevenue: Array<{ month: string; year: number; revenue: number }>;
  occupancyRate: number;
  bookingsPerMonth: Array<{ month: string; year: number; count: number }>;
  listingCount: number;
  pricePerformance: Array<{
    listingId: string;
    title: string;
    listingPrice: number;
    marketAveragePrice: number;
    priceDifferencePercent: number;
    status: string;
  }>;
  aiInsight: string;
};

export async function fetchHostDashboard(): Promise<HostDashboardData> {
  return apiRequest<HostDashboardData>('/host/dashboard', { cacheTtlMs: 60_000 });
}

export async function travelSearch(params: {
  place: string;
  radiusKm?: number;
  limit?: number;
}): Promise<TravelSearchResponse> {
  const response = await fetch(`${API_BASE_URL}/travel/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Travel search failed');
  return response.json() as Promise<TravelSearchResponse>;
}

export async function fetchMapListings(bounds: MapBoundsParams): Promise<MapListingItem[]> {
  const query = new URLSearchParams();
  appendQuery(query, 'north', bounds.north);
  appendQuery(query, 'south', bounds.south);
  appendQuery(query, 'east', bounds.east);
  appendQuery(query, 'west', bounds.west);

  const url = `${API_BASE_URL}/listings/map?${query.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Map listings request failed (${response.status})`);
  }

  const payload = (await response.json()) as { listings: MapListingItem[] };
  return payload.listings;
}

function appendQuery(query: URLSearchParams, key: string, value: string | number | undefined): void {
  if (value === undefined || value === null || value === '') {
    return;
  }
  query.set(key, String(value));
}
