import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../auth/auth.middleware.js';
import { AiListingController } from './ai-listing.controller.js';

export async function registerAiListingRoutes(
  fastify: FastifyInstance,
  controller: AiListingController,
): Promise<void> {
  fastify.post(
    '/ai-listing/analyze',
    { preHandler: requireAuth },
    async (request, reply) => controller.analyze(request, reply),
  );
}
