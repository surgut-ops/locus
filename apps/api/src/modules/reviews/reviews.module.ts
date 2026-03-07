import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { ReviewsController } from './reviews.controller.js';
import { ReviewsRepository } from './reviews.repository.js';
import { registerReviewsRoutes } from './reviews.routes.js';
import { ReviewsService } from './reviews.service.js';

type ReviewsModuleOptions = {
  prisma: PrismaClient;
};

export async function registerReviewsModule(
  fastify: FastifyInstance,
  options: ReviewsModuleOptions,
): Promise<void> {
  const repository = new ReviewsRepository(options.prisma);
  const service = new ReviewsService(repository, options.prisma);
  const controller = new ReviewsController(service);
  await registerReviewsRoutes(fastify, controller);
}
