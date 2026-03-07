import type { FastifyInstance } from 'fastify';

import { TravelController } from './travel.controller.js';

export async function registerTravelRoutes(
  fastify: FastifyInstance,
  controller: TravelController,
): Promise<void> {
  fastify.post('/travel/search', async (request, reply) =>
    controller.search(request, reply),
  );
}
