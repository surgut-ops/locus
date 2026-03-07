import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { TrustController } from './trust.controller.js';
import { TrustRepository } from './trust.repository.js';
import { registerTrustRoutes } from './trust.routes.js';
import { TrustService } from './trust.service.js';

type TrustModuleOptions = {
  prisma: PrismaClient;
};

export async function registerTrustModule(
  fastify: FastifyInstance,
  options: TrustModuleOptions,
): Promise<void> {
  const repository = new TrustRepository(options.prisma);
  const service = new TrustService(repository, options.prisma);
  const controller = new TrustController(service);
  await registerTrustRoutes(fastify, controller);
}
