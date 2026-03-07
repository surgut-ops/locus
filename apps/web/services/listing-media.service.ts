import { apiRequest } from '../lib/api';

export type ListingImageItem = {
  id: string;
  listingId: string;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  order: number;
  createdAt: string;
};

export async function uploadListingImage(listingId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest<ListingImageItem>(`/listings/${listingId}/images`, {
    method: 'POST',
    body: formData,
  });
}

export async function getListingImages(listingId: string) {
  return apiRequest<ListingImageItem[]>(`/listings/${listingId}/images`, { cacheTtlMs: 15_000 });
}
