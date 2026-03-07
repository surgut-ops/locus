import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { CacheService } from '../infrastructure/cache/cache.service.js';
import type { RecommendationsService } from '../recommendations/recommendations.service.js';
import { SearchClient } from './search.client.js';
import { SearchController } from './search.controller.js';
import { SearchRepository } from './search.repository.js';
import { registerSearchRoutes } from './search.routes.js';
import { SearchService } from './search.service.js';

type SearchModuleOptions = {
  prisma: PrismaClient;
  recommendationsService?: RecommendationsService;
};

export async function registerSearchModule(
  fastify: FastifyInstance,
  options: SearchModuleOptions,
): Promise<void> {
  const repository = new SearchRepository(options.prisma);
  const client = new SearchClient();
  const cache = new CacheService();
  const service = new SearchService(repository, client, cache, options.recommendationsService);
  const controller = new SearchController(service);

  await registerSearchRoutes(fastify, controller);
}
