import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../auth/auth.middleware.js';
import { BookingsController } from './bookings.controller.js';

export async function registerBookingsRoutes(
  fastify: FastifyInstance,
  controller: BookingsController,
): Promise<void> {
  fastify.post('/bookings', { preHandler: requireAuth }, async (request, reply) =>
    controller.create(request, reply),
  );
  fastify.put<{ Params: { id: string } }>(
    '/bookings/:id/approve',
    { preHandler: requireAuth },
    async (request, reply) => controller.approve(request, reply),
  );
  fastify.put<{ Params: { id: string } }>(
    '/bookings/:id/cancel',
    { preHandler: requireAuth },
    async (request, reply) => controller.cancel(request, reply),
  );
  fastify.get<{ Params: { id: string }; Querystring: { from?: string; to?: string } }>(
    '/listings/:id/calendar',
    async (request, reply) => controller.calendar(request, reply),
  );
  fastify.get('/users/me/bookings', { preHandler: requireAuth }, async (request, reply) =>
    controller.myBookings(request, reply),
  );
  fastify.get('/hosts/me/bookings', { preHandler: requireAuth }, async (request, reply) =>
    controller.hostBookings(request, reply),
  );
}
