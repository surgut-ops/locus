import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { registerHeatmapModule } from '../modules/heatmap/heatmap.module.js';

type HeatmapRoutesOptions = {
  prisma: PrismaClient;
};

export async function registerHeatmapModuleRoutes(
  fastify: FastifyInstance,
  options: HeatmapRoutesOptions,
): Promise<void> {
  await registerHeatmapModule(fastify, { prisma: options.prisma });
}
