import { BookingStatus, ListingStatus, UserRole } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import { getQueueService } from '../infrastructure/queue/queue.service.js';
import { ReputationService } from '../reputation/reputation.service.js';
import type { AuthenticatedUser } from '../../utils/auth.js';
import type { NotificationsService } from '../notifications/notifications.service.js';
import type { RecommendationsService } from '../recommendations/recommendations.service.js';
import { BookingsCalendar } from './bookings.calendar.js';
import { BookingsPricing } from './bookings.pricing.js';
import { BookingsRepository } from './bookings.repository.js';
import { BookingsError, type ParsedBookingRequest } from './bookings.types.js';

export class BookingsService {
  public constructor(
    private readonly repository: BookingsRepository,
    private readonly calendar: BookingsCalendar,
    private readonly pricing: BookingsPricing,
    private readonly recommendationsService?: RecommendationsService,
    private readonly notificationsService?: NotificationsService,
    private readonly prisma?: PrismaClient,
  ) {}

  public async createBooking(actor: AuthenticatedUser, payload: unknown) {
    const dto = parseCreateBooking(payload);
    const listing = await this.repository.getListingForBooking(dto.listingId);

    if (!listing) {
      throw new BookingsError('Listing not found', 404);
    }
    if (listing.status !== ListingStatus.PUBLISHED) {
      throw new BookingsError('Listing not available', 400);
    }
    if (listing.ownerId === actor.id) {
      throw new BookingsError('Guest cannot book own listing', 403);
    }
    if (listing.maxGuests !== null && dto.guests > listing.maxGuests) {
      throw new BookingsError('Guests count exceeds listing capacity', 400);
    }

    const isAvailable = await this.calendar.checkAvailability(dto.listingId, dto.startDate, dto.endDate);
    if (!isAvailable) {
      throw new BookingsError('Dates already booked', 409);
    }

    const totalPrice = this.pricing.calculateBookingPrice(listing, dto.startDate, dto.endDate);

    const booking = await this.repository.createBookingWithTransaction({
      listingId: dto.listingId,
      guestId: actor.id,
      startDate: dto.startDate,
      endDate: dto.endDate,
      totalPrice,
      currency: listing.currency,
    });

    if (!booking) {
      throw new BookingsError('Dates already booked', 409);
    }

    if (this.recommendationsService) {
      await this.recommendationsService.trackBooking(actor.id, dto.listingId);
    }

    const guestName = await this.repository.getUserName(actor.id);
    if (this.notificationsService && listing.title) {
      this.notificationsService
        .notifyNewBooking(listing.ownerId, guestName, listing.title)
        .catch(() => {});
    }

    const queueService = getQueueService();
    if (queueService && listing.title) {
      await queueService.addNotificationJob({
        type: 'booking',
        userId: listing.ownerId,
        title: 'Новое бронирование',
        body: `${guestName} забронировал «${listing.title}»`,
      });
    }

    const guestEmail = await this.repository.getUserEmail(actor.id);
    if (queueService && guestEmail) {
      await queueService.addEmailJob({
        template: 'booking_confirmation',
        to: guestEmail,
        subject: 'Подтверждение бронирования — LOCUS',
        data: {
          guestName,
          listingTitle: listing.title,
          startDate: dto.startDate.toISOString().slice(0, 10),
          endDate: dto.endDate.toISOString().slice(0, 10),
          totalPrice: String(totalPrice),
          currency: listing.currency,
        },
      });
    }

    return booking;
  }

  public async approveBooking(actor: AuthenticatedUser, bookingId: string) {
    assertId(bookingId, 'Booking id is required');

    const booking = await this.repository.getBookingById(bookingId);
    if (!booking) {
      throw new BookingsError('Booking not found', 404);
    }
    if (booking.listing.ownerId !== actor.id) {
      throw new BookingsError('Only listing host can approve booking', 403);
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BookingsError('Only pending bookings can be approved', 400);
    }

    const isAvailable = await this.calendar.checkAvailability(
      booking.listingId,
      booking.startDate,
      booking.endDate,
    );
    if (!isAvailable) {
      throw new BookingsError('Listing not available', 409);
    }

    const updated = await this.repository.updateBookingStatus(bookingId, BookingStatus.CONFIRMED);
    await this.calendar.blockDates(booking.listingId, booking.startDate, booking.endDate);

    if (this.prisma) {
      ReputationService.recalculateForUser(this.prisma, booking.guestId).catch(() => {});
      ReputationService.recalculateForUser(this.prisma, booking.listing.ownerId).catch(() => {});
    }

    return updated;
  }

  public async cancelBooking(actor: AuthenticatedUser, bookingId: string) {
    assertId(bookingId, 'Booking id is required');
    const booking = await this.repository.getBookingById(bookingId);
    if (!booking) {
      throw new BookingsError('Booking not found', 404);
    }

    const canCancel = booking.guestId === actor.id || booking.listing.ownerId === actor.id;
    if (!canCancel) {
      throw new BookingsError('Only guest or host can cancel booking', 403);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return booking;
    }

    const updated = await this.repository.updateBookingStatus(bookingId, BookingStatus.CANCELLED);

    if (this.prisma) {
      ReputationService.recalculateForUser(this.prisma, booking.guestId).catch(() => {});
      ReputationService.recalculateForUser(this.prisma, booking.listing.ownerId).catch(() => {});
    }

    return updated;
  }

  public async getListingCalendar(listingId: string, query: unknown) {
    assertId(listingId, 'Listing id is required');

    const parsed = parseCalendarRange(query);
    return this.calendar.getListingCalendar(listingId, parsed.from, parsed.to);
  }

  public async getMyBookings(actor: AuthenticatedUser) {
    return this.repository.getMyBookings(actor.id);
  }

  public async getHostBookings(actor: AuthenticatedUser) {
    if (actor.role !== UserRole.HOST && actor.role !== UserRole.ADMIN && actor.role !== UserRole.MODERATOR) {
      throw new BookingsError('Host role required', 403);
    }
    return this.repository.getHostBookings(actor.id);
  }
}

function parseCreateBooking(payload: unknown): ParsedBookingRequest {
  if (!isObject(payload)) {
    throw new BookingsError('Invalid booking payload', 400);
  }

  const listingId = requireString(payload.listingId, 'listingId');
  const startDate = parseDate(payload.startDate, 'startDate');
  const endDate = parseDate(payload.endDate, 'endDate');
  const guests = requireInt(payload.guests, 'guests');

  const now = new Date();
  if (startDate <= now) {
    throw new BookingsError('Invalid booking period: startDate must be in the future', 400);
  }
  if (endDate <= startDate) {
    throw new BookingsError('Invalid booking period: endDate must be after startDate', 400);
  }
  if (guests <= 0) {
    throw new BookingsError('Invalid booking period: guests must be positive', 400);
  }

  return { listingId, startDate, endDate, guests };
}

function parseCalendarRange(query: unknown): { from: Date; to: Date } {
  const now = new Date();
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const defaultTo = new Date(defaultFrom);
  defaultTo.setUTCDate(defaultTo.getUTCDate() + 180);

  if (!isObject(query)) {
    return { from: defaultFrom, to: defaultTo };
  }

  const from = query.from ? parseDate(query.from, 'from') : defaultFrom;
  const to = query.to ? parseDate(query.to, 'to') : defaultTo;

  if (to < from) {
    throw new BookingsError('Invalid booking period', 400);
  }

  return { from, to };
}

function parseDate(value: unknown, field: string): Date {
  if (typeof value !== 'string') {
    throw new BookingsError(`Field "${field}" must be an ISO date string`, 400);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BookingsError(`Field "${field}" must be a valid date`, 400);
  }
  return date;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BookingsError(`Field "${field}" is required`, 400);
  }
  return value.trim();
}

function requireInt(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new BookingsError(`Field "${field}" must be an integer`, 400);
  }
  return value;
}

function assertId(value: string, message: string): void {
  if (!value || !value.trim()) {
    throw new BookingsError(message, 400);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
