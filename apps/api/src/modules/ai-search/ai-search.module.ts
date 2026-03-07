import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { CacheService } from '../infrastructure/cache/cache.service.js';
import type { RecommendationsService } from '../recommendations/recommendations.service.js';
import { SearchClient } from '../search/search.client.js';
import { SearchRepository } from '../search/search.repository.js';
import { SearchService } from '../search/search.service.js';
import { AiSearchController } from './ai-search.controller.js';
import { AiSearchService } from './ai-search.service.js';
import { registerAiSearchRoutes } from './ai-search.routes.js';

type AiSearchModuleOptions = {
  prisma: PrismaClient;
  recommendationsService?: RecommendationsService;
};

export async function registerAiSearchModule(
  fastify: FastifyInstance,
  options: AiSearchModuleOptions,
): Promise<void> {
  const repository = new SearchRepository(options.prisma);
  const client = new SearchClient();
  const cache = new CacheService();
  const searchService = new SearchService(
    repository,
    client,
    cache,
    options.recommendationsService,
  );
  const aiSearchService = new AiSearchService(searchService, cache);
  const controller = new AiSearchController(aiSearchService);

  await registerAiSearchRoutes(fastify, controller);
}
