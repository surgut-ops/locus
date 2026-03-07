import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { registerListingsModule } from '../modules/listings/listings.module.js';
import type { ModerationService } from '../modules/moderation/moderation.service.js';
import type { RecommendationsService } from '../modules/recommendations/recommendations.service.js';

type ListingsRoutesOptions = {
  prisma: PrismaClient;
  recommendationsService?: RecommendationsService;
  moderationService?: ModerationService;
};

export async function registerListingsRoutes(
  fastify: FastifyInstance,
  options: ListingsRoutesOptions,
): Promise<void> {
  await registerListingsModule(fastify, {
    prisma: options.prisma,
    recommendationsService: options.recommendationsService,
    moderationService: options.moderationService,
  });
}
