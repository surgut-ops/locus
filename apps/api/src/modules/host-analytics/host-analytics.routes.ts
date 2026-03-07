import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../auth/auth.middleware.js';
import { HostAnalyticsController } from './host-analytics.controller.js';

export async function registerHostAnalyticsRoutes(
  fastify: FastifyInstance,
  controller: HostAnalyticsController,
): Promise<void> {
  fastify.get(
    '/host/dashboard',
    { preHandler: requireAuth },
    async (request, reply) => controller.getDashboard(request, reply),
  );
}
