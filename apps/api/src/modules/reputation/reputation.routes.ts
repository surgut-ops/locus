import type { FastifyInstance } from 'fastify';

import { ReputationController } from './reputation.controller.js';

export async function registerReputationRoutes(
  fastify: FastifyInstance,
  controller: ReputationController,
): Promise<void> {
  fastify.get<{ Params: { id: string } }>('/reputation/user/:id', async (request, reply) =>
    controller.getUserReputation(request, reply),
  );
}
