import type { BookingsRepository } from './bookings.repository.js';

export class BookingsCalendar {
  public constructor(private readonly repository: BookingsRepository) {}

  public async checkAvailability(listingId: string, startDate: Date, endDate: Date): Promise<boolean> {
    const overlappingBookings = await this.repository.getOverlappingBookings(listingId, startDate, endDate);
    return overlappingBookings.length === 0;
  }

  public async blockDates(listingId: string, startDate: Date, endDate: Date): Promise<void> {
    const dates = getDatesBetween(startDate, endDate);
    if (dates.length === 0) {
      return;
    }
    await this.repository.blockDates(listingId, dates);
  }

  public async getListingCalendar(listingId: string, from: Date, to: Date) {
    const rows = await this.repository.getBookedRanges(listingId, from, to);
    return rows.map((row) => ({
      startDate: row.startDate.toISOString(),
      endDate: row.endDate.toISOString(),
    }));
  }
}

export function getDatesBetween(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = startOfUtcDay(startDate);
  const end = startOfUtcDay(endDate);

  while (current < end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

