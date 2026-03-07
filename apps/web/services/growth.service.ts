import { apiRequest } from '../lib/api';

type GrowthEventType =
  | 'user_signup'
  | 'listing_created'
  | 'listing_view'
  | 'booking_created'
  | 'search_performed'
  | 'message_sent'
  | 'visit_homepage'
  | 'search_listings'
  | 'view_listing'
  | 'complete_payment';

export async function trackGrowthEvent(eventType: GrowthEventType, metadata: Record<string, unknown> = {}) {
  return apiRequest<{ success: true }>('/analytics/event', {
    method: 'POST',
    body: { eventType, metadata },
  });
}

export async function fetchTrendingSearches(limit = 10) {
  return apiRequest<Array<{ query: string; count: number }>>(`/growth/trending-searches?limit=${limit}`, {
    cacheTtlMs: 30_000,
  });
}

export async function getAdminGrowthMetrics() {
  return apiRequest<{
    dailyUsers: number;
    newListings: number;
    conversionRate: number;
    revenueGrowth: number;
    funnel: {
      visitHomepageToSearch: number;
      searchToViewListing: number;
      viewListingToBooking: number;
      bookingToPayment: number;
      overallVisitToPayment: number;
    };
  }>('/admin/growth', { cacheTtlMs: 30_000 });
}
