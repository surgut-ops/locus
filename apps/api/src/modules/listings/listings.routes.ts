import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../auth/auth.middleware.js';
import { ListingsController } from './listings.controller.js';
import { ListingsMapController } from './listings.map.controller.js';

export async function registerListingsRoutes(
  fastify: FastifyInstance,
  controller: ListingsController,
  mapController: ListingsMapController,
): Promise<void> {
  fastify.post('/listings', { preHandler: requireAuth }, async (request, reply) =>
    controller.create(request, reply),
  );
  fastify.get('/listings/map', async (request, reply) => mapController.getMapListings(request, reply));
  fastify.get<{ Params: { id: string } }>('/listings/:id', async (request, reply) =>
    controller.getById(request, reply),
  );
  fastify.put<{ Params: { id: string } }>(
    '/listings/:id',
    { preHandler: requireAuth },
    async (request, reply) => controller.update(request, reply),
  );
  fastify.delete<{ Params: { id: string } }>(
    '/listings/:id',
    { preHandler: requireAuth },
    async (request, reply) => controller.archive(request, reply),
  );
  fastify.get('/users/me/listings', { preHandler: requireAuth }, async (request, reply) =>
    controller.getMyListings(request, reply),
  );
  fastify.get<{ Params: { id: string } }>('/users/:id/listings', async (request, reply) =>
    controller.getByUserId(request, reply),
  );
}
