import type { FastifyInstance } from 'fastify';

import { HeatmapController } from './heatmap.controller.js';

export async function registerHeatmapRoutes(
  fastify: FastifyInstance,
  controller: HeatmapController,
): Promise<void> {
  fastify.get<{ Params: { city: string } }>(
    '/heatmap/city/:city',
    async (request, reply) => controller.getCityHeatmap(request, reply),
  );
}
