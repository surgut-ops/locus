import { apiRequest } from '../lib/api';
import type { Listing } from '../types';

export async function fetchRecommendations() {
  return apiRequest<Listing[]>('/recommendations', { cacheTtlMs: 5 * 60_000 });
}

export async function fetchTrending() {
  return apiRequest<Listing[]>('/ai/trending', { cacheTtlMs: 60_000 });
}

export async function aiSearch(prompt: string) {
  return apiRequest<{ items: Listing[]; filtersUsed: Record<string, unknown> | null }>('/ai/search', {
    method: 'POST',
    body: { prompt },
  });
}

export async function trackView(listingId: string) {
  return apiRequest<{ success: boolean }>('/events/view', {
    method: 'POST',
    body: { listingId },
  });
}

export async function trackSearch(query: string, filters: Record<string, unknown>) {
  return apiRequest<{ success: boolean }>('/events/search', {
    method: 'POST',
    body: { query, filters },
  });
}
