import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { AmenitiesController } from './amenities.controller.js';
import { AmenitiesRepository } from './amenities.repository.js';
import { registerAmenitiesRoutes } from './amenities.routes.js';
import { AmenitiesService } from './amenities.service.js';

type AmenitiesModuleOptions = {
  prisma: PrismaClient;
};

export async function registerAmenitiesModule(
  fastify: FastifyInstance,
  options: AmenitiesModuleOptions,
): Promise<void> {
  const repository = new AmenitiesRepository(options.prisma);
  const service = new AmenitiesService(repository);
  const controller = new AmenitiesController(service);
  await registerAmenitiesRoutes(fastify, controller);
}
