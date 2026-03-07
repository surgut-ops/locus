import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuthError, requireAuthenticatedUser } from '../../utils/auth.js';
import { BookingsService } from './bookings.service.js';
import { BookingsError } from './bookings.types.js';

type BookingParams = {
  id: string;
};

type ListingParams = {
  id: string;
};

type CalendarQuery = {
  from?: string;
  to?: string;
};

export class BookingsController {
  public constructor(private readonly service: BookingsService) {}

  public async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actor = requireAuthenticatedUser(request);
      const booking = await this.service.createBooking(actor, request.body);
      return reply.code(201).send(booking);
    } catch (error) {
      return handleBookingsError(reply, error);
    }
  }

  public async approve(
    request: FastifyRequest<{ Params: BookingParams }>,
    reply: FastifyReply,
  ) {
    try {
      const actor = requireAuthenticatedUser(request);
      const booking = await this.service.approveBooking(actor, request.params.id);
      return reply.code(200).send(booking);
    } catch (error) {
      return handleBookingsError(reply, error);
    }
  }

  public async cancel(
    request: FastifyRequest<{ Params: BookingParams }>,
    reply: FastifyReply,
  ) {
    try {
      const actor = requireAuthenticatedUser(request);
      const booking = await this.service.cancelBooking(actor, request.params.id);
      return reply.code(200).send(booking);
    } catch (error) {
      return handleBookingsError(reply, error);
    }
  }

  public async calendar(
    request: FastifyRequest<{ Params: ListingParams; Querystring: CalendarQuery }>,
    reply: FastifyReply,
  ) {
    try {
      const data = await this.service.getListingCalendar(request.params.id, request.query);
      return reply.code(200).send(data);
    } catch (error) {
      return handleBookingsError(reply, error);
    }
  }

  public async myBookings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actor = requireAuthenticatedUser(request);
      const history = await this.service.getMyBookings(actor);
      return reply.code(200).send(history);
    } catch (error) {
      return handleBookingsError(reply, error);
    }
  }

  public async hostBookings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actor = requireAuthenticatedUser(request);
      const history = await this.service.getHostBookings(actor);
      return reply.code(200).send(history);
    } catch (error) {
      return handleBookingsError(reply, error);
    }
  }
}

function handleBookingsError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof BookingsError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
