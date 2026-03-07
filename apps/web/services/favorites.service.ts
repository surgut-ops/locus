import { apiRequest } from '../lib/api';

export async function saveFavorite(listingId: string) {
  return apiRequest('/favorites', {
    method: 'POST',
    body: { listingId },
  });
}
