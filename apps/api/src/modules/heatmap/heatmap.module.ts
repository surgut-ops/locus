import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { HeatmapController } from './heatmap.controller.js';
import { HeatmapRepository } from './heatmap.repository.js';
import { registerHeatmapRoutes } from './heatmap.routes.js';
import { HeatmapService } from './heatmap.service.js';

type HeatmapModuleOptions = {
  prisma: PrismaClient;
};

export async function registerHeatmapModule(
  fastify: FastifyInstance,
  options: HeatmapModuleOptions,
): Promise<void> {
  const repository = new HeatmapRepository(options.prisma);
  const service = new HeatmapService(repository);
  const controller = new HeatmapController(service);

  await registerHeatmapRoutes(fastify, controller);
}
