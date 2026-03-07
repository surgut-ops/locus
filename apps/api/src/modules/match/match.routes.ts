import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../auth/auth.middleware.js';
import { MatchController } from './match.controller.js';

export async function registerMatchRoutes(
  fastify: FastifyInstance,
  controller: MatchController,
): Promise<void> {
  fastify.get(
    '/match/recommendations',
    { preHandler: requireAuth },
    async (request, reply) => controller.getRecommendations(request, reply),
  );
}
