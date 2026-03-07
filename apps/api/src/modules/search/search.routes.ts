import type { FastifyInstance } from 'fastify';

import { SearchController } from './search.controller.js';

export async function registerSearchRoutes(
  fastify: FastifyInstance,
  controller: SearchController,
): Promise<void> {
  fastify.get('/search', async (request, reply) => controller.search(request, reply));
}
