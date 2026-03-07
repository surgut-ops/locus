import type { FastifyInstance } from 'fastify';

import { AiSearchController } from './ai-search.controller.js';

export async function registerAiSearchRoutes(
  fastify: FastifyInstance,
  controller: AiSearchController,
): Promise<void> {
  fastify.post('/ai-search', async (request, reply) =>
    controller.search(request, reply),
  );
}
