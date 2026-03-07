import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import type { RecommendationsService } from '../modules/recommendations/recommendations.service.js';
import { registerSearchModule } from '../modules/search/search.module.js';

type SearchRoutesOptions = {
  prisma: PrismaClient;
  recommendationsService?: RecommendationsService;
};

export async function registerSearchModuleRoutes(
  fastify: FastifyInstance,
  options: SearchRoutesOptions,
): Promise<void> {
  await registerSearchModule(fastify, {
    prisma: options.prisma,
    recommendationsService: options.recommendationsService,
  });
}
