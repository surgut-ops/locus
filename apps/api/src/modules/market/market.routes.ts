import type { FastifyInstance } from 'fastify';

import { MarketController } from './market.controller.js';

export async function registerMarketRoutes(
  fastify: FastifyInstance,
  controller: MarketController,
): Promise<void> {
  fastify.get<{ Params: { id: string } }>(
    '/market/listing/:id',
    async (request, reply) => controller.getListingInsight(request, reply),
  );
}
