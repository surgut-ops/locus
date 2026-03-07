import type { BookingStatus } from '@prisma/client';

export type CreateBookingDto = {
  listingId: string;
  startDate: string;
  endDate: string;
  guests: number;
};

export type ParsedBookingRequest = {
  listingId: string;
  startDate: Date;
  endDate: Date;
  guests: number;
};

export type BookingCalendarResponse = {
  startDate: string;
  endDate: string;
}[];

export type BookingSummary = {
  id: string;
  listingId: string;
  guestId: string;
  status: BookingStatus;
  startDate: Date;
  endDate: Date;
  totalPrice: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

export class BookingsError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'BookingsError';
    this.statusCode = statusCode;
  }
}
