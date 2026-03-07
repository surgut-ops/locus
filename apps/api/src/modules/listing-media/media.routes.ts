import type { FastifyInstance } from 'fastify';

import { ListingMediaController } from './media.controller.js';

export async function registerListingMediaRoutes(
  fastify: FastifyInstance,
  controller: ListingMediaController,
): Promise<void> {
  fastify.post<{ Params: { id: string } }>('/listings/:id/images', async (request, reply) =>
    controller.upload(request, reply),
  );
  fastify.get<{ Params: { id: string } }>('/listings/:id/images', async (request, reply) =>
    controller.list(request, reply),
  );
  fastify.delete<{ Params: { id: string } }>('/images/:id', async (request, reply) =>
    controller.delete(request, reply),
  );
}
