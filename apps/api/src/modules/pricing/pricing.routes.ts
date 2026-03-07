import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../auth/auth.middleware.js';
import { PricingController } from './pricing.controller.js';

export async function registerPricingRoutes(
  fastify: FastifyInstance,
  controller: PricingController,
): Promise<void> {
  fastify.get(
    '/pricing/suggest',
    { preHandler: requireAuth },
    async (request, reply) => controller.suggest(request, reply),
  );
}
