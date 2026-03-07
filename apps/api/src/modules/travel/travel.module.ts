import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { TravelController } from './travel.controller.js';
import { TravelRepository } from './travel.repository.js';
import { registerTravelRoutes } from './travel.routes.js';
import { TravelService } from './travel.service.js';

type TravelModuleOptions = { prisma: PrismaClient };

export async function registerTravelModule(
  fastify: FastifyInstance,
  options: TravelModuleOptions,
): Promise<void> {
  const repository = new TravelRepository(options.prisma);
  const service = new TravelService(repository);
  const controller = new TravelController(service);
  await registerTravelRoutes(fastify, controller);
}
