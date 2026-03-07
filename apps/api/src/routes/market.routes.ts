import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { registerMarketModule } from '../modules/market/market.module.js';

type MarketRoutesOptions = {
  prisma: PrismaClient;
};

export async function registerMarketModuleRoutes(
  fastify: FastifyInstance,
  options: MarketRoutesOptions,
): Promise<void> {
  await registerMarketModule(fastify, { prisma: options.prisma });
}
