import type { FastifyInstance } from 'fastify';

import { RecommendationsController } from './recommendations.controller.js';

export async function registerRecommendationsRoutes(
  fastify: FastifyInstance,
  controller: RecommendationsController,
): Promise<void> {
  fastify.get('/recommendations', async (request, reply) =>
    controller.getRecommendations(request, reply),
  );
}
