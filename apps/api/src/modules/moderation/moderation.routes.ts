import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../auth/auth.middleware.js';
import { ModerationController, requireModerator } from './moderation.controller.js';

export async function registerModerationRoutes(
  fastify: FastifyInstance,
  controller: ModerationController,
): Promise<void> {
  const preHandler = [requireAuth, requireModerator];

  fastify.get(
    '/moderation/pending',
    { preHandler },
    async (request, reply) => controller.getPending(request, reply),
  );
  fastify.post<{ Params: { id: string } }>(
    '/moderation/:id/approve',
    { preHandler },
    async (request, reply) => controller.approve(request, reply),
  );
  fastify.post<{ Params: { id: string } }>(
    '/moderation/:id/reject',
    { preHandler },
    async (request, reply) => controller.reject(request, reply),
  );
}
