import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { CacheService } from '../infrastructure/cache/cache.service.js';
import type { ModerationService } from '../moderation/moderation.service.js';
import type { RecommendationsService } from '../recommendations/recommendations.service.js';
import { ListingsController } from './listings.controller.js';
import { ListingsMapController } from './listings.map.controller.js';
import { ListingsRepository } from './listings.repository.js';
import { registerListingsRoutes } from './listings.routes.js';
import { ListingsService } from './listings.service.js';

type ListingsModuleOptions = {
  prisma: PrismaClient;
  recommendationsService?: RecommendationsService;
  moderationService?: ModerationService;
};

export async function registerListingsModule(
  fastify: FastifyInstance,
  options: ListingsModuleOptions,
): Promise<void> {
  const repository = new ListingsRepository(options.prisma);
  const cache = new CacheService();
  const service = new ListingsService(repository, cache);
  const controller = new ListingsController(
    service,
    options.recommendationsService,
    options.moderationService,
  );
  const mapController = new ListingsMapController(service);

  await registerListingsRoutes(fastify, controller, mapController);
}
