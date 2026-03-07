import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import {
  registerRecommendationsModule,
} from '../modules/recommendations/recommendations.module.js';
import type { RecommendationsService } from '../modules/recommendations/recommendations.service.js';

type RecommendationsRoutesOptions = {
  prisma: PrismaClient;
};

export async function registerRecommendationsModuleRoutes(
  fastify: FastifyInstance,
  options: RecommendationsRoutesOptions,
): Promise<RecommendationsService> {
  return registerRecommendationsModule(fastify, { prisma: options.prisma });
}
