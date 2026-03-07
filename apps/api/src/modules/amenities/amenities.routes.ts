import type { FastifyInstance } from 'fastify';

import { AmenitiesController } from './amenities.controller.js';

export async function registerAmenitiesRoutes(
  fastify: FastifyInstance,
  controller: AmenitiesController,
): Promise<void> {
  fastify.post('/amenities', async (request, reply) => controller.createAmenity(request, reply));
  fastify.get('/amenities', async (request, reply) => controller.getAmenities(request, reply));
  fastify.post<{ Params: { id: string } }>('/listings/:id/amenities', async (request, reply) =>
    controller.assignAmenities(request, reply),
  );
  fastify.get<{ Params: { id: string } }>('/listings/:id/amenities', async (request, reply) =>
    controller.getListingAmenities(request, reply),
  );
  fastify.delete<{ Params: { id: string; amenityId: string } }>(
    '/listings/:id/amenities/:amenityId',
    async (request, reply) => controller.removeAmenity(request, reply),
  );
}
