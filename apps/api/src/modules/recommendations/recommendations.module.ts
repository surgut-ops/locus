import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { CacheService } from '../infrastructure/cache/cache.service.js';
import { RecommendationsController } from './recommendations.controller.js';
import { RecommendationsRepository } from './recommendations.repository.js';
import { registerRecommendationsRoutes } from './recommendations.routes.js';
import { RecommendationsService } from './recommendations.service.js';

type RecommendationsModuleOptions = {
  prisma: PrismaClient;
};

export async function registerRecommendationsModule(
  fastify: FastifyInstance,
  options: RecommendationsModuleOptions,
): Promise<RecommendationsService> {
  const repository = new RecommendationsRepository(options.prisma);
  const cache = new CacheService();
  const service = new RecommendationsService(repository, cache);
  const controller = new RecommendationsController(service);

  await registerRecommendationsRoutes(fastify, controller);

  return service;
}
