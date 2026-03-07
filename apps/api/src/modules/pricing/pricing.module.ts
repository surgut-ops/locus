import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { PricingController } from './pricing.controller.js';
import { PricingRepository } from './pricing.repository.js';
import { registerPricingRoutes } from './pricing.routes.js';
import { PricingService } from './pricing.service.js';

type PricingModuleOptions = {
  prisma: PrismaClient;
};

export async function registerPricingModule(
  fastify: FastifyInstance,
  options: PricingModuleOptions,
): Promise<void> {
  const repository = new PricingRepository(options.prisma);
  const service = new PricingService(repository);
  const controller = new PricingController(service);
  await registerPricingRoutes(fastify, controller);
}
