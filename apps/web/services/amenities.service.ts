import { apiRequest } from '../lib/api';

export type AmenityItem = {
  id: string;
  name: string;
  icon: string | null;
  category: string;
};

export async function getAmenities() {
  return apiRequest<AmenityItem[]>('/amenities', { cacheTtlMs: 60_000 });
}

export async function assignListingAmenities(listingId: string, amenityIds: string[]) {
  return apiRequest<{ listingId: string; amenities: AmenityItem[] }>(`/listings/${listingId}/amenities`, {
    method: 'POST',
    body: { amenityIds },
  });
}
