import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import type { RecommendationsService } from '../modules/recommendations/recommendations.service.js';
import { registerAiSearchModule } from '../modules/ai-search/ai-search.module.js';

type AiSearchRoutesOptions = {
  prisma: PrismaClient;
  recommendationsService?: RecommendationsService;
};

export async function registerAiSearchModuleRoutes(
  fastify: FastifyInstance,
  options: AiSearchRoutesOptions,
): Promise<void> {
  await registerAiSearchModule(fastify, {
    prisma: options.prisma,
    recommendationsService: options.recommendationsService,
  });
}
