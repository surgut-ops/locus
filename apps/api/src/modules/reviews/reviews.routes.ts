import type { FastifyInstance } from 'fastify';

import { ReviewsController } from './reviews.controller.js';

export async function registerReviewsRoutes(
  fastify: FastifyInstance,
  controller: ReviewsController,
): Promise<void> {
  fastify.post('/reviews', async (request, reply) => controller.create(request, reply));
  fastify.get<{ Params: { id: string }; Querystring: { page?: string; limit?: string } }>(
    '/listings/:id/reviews',
    async (request, reply) => controller.getByListing(request, reply),
  );
}
