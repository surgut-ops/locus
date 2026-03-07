import type { FastifyInstance } from 'fastify';

import { TrustController } from './trust.controller.js';

export async function registerTrustRoutes(
  fastify: FastifyInstance,
  controller: TrustController,
): Promise<void> {
  fastify.get<{ Params: { id: string } }>('/trust/user/:id', async (request, reply) =>
    controller.getUserTrust(request, reply),
  );
  fastify.get<{ Params: { id: string } }>('/trust/listing/:id', async (request, reply) =>
    controller.getListingTrust(request, reply),
  );
}
