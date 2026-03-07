import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { registerPricingModule } from '../modules/pricing/pricing.module.js';

type PricingRoutesOptions = {
  prisma: PrismaClient;
};

export async function registerPricingModuleRoutes(
  fastify: FastifyInstance,
  options: PricingRoutesOptions,
): Promise<void> {
  await registerPricingModule(fastify, { prisma: options.prisma });
}
