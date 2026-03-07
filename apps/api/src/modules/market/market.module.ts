import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { MarketController } from './market.controller.js';
import { MarketRepository } from './market.repository.js';
import { registerMarketRoutes } from './market.routes.js';
import { MarketService } from './market.service.js';

type MarketModuleOptions = {
  prisma: PrismaClient;
};

export async function registerMarketModule(
  fastify: FastifyInstance,
  options: MarketModuleOptions,
): Promise<void> {
  const repository = new MarketRepository(options.prisma);
  const service = new MarketService(repository);
  const controller = new MarketController(service);

  await registerMarketRoutes(fastify, controller);
}
