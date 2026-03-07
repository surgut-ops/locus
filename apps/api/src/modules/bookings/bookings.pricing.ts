import { Prisma, type Listing } from '@prisma/client';
import { BookingsError } from './bookings.types.js';

type BookingListing = Pick<Listing, 'id' | 'pricePerNight' | 'pricePerMonth' | 'currency'>;

export class BookingsPricing {
  public calculateBookingPrice(listing: BookingListing, startDate: Date, endDate: Date): Prisma.Decimal {
    const nights = getNightsCount(startDate, endDate);
    if (nights <= 0) {
      throw new BookingsError('Invalid booking period', 400);
    }

    if (!listing.pricePerNight) {
      throw new BookingsError('Listing has no nightly price', 400);
    }

    return listing.pricePerNight.times(nights);
  }
}

function getNightsCount(startDate: Date, endDate: Date): number {
  const dayMs = 24 * 60 * 60 * 1000;
  const start = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  return Math.round((end - start) / dayMs);
}
