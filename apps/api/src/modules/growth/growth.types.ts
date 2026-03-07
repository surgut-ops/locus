export type GrowthEventType =
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

export type GrowthEvent = {
  id: string;
  eventType: GrowthEventType;
  userId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ConversionRates = {
  visitHomepageToSearch: number;
  searchToViewListing: number;
  viewListingToBooking: number;
  bookingToPayment: number;
  overallVisitToPayment: number;
};

export class GrowthError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'GrowthError';
    this.statusCode = statusCode;
  }
}
