import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { ReputationController } from './reputation.controller.js';
import { ReputationRepository } from './reputation.repository.js';
import { registerReputationRoutes } from './reputation.routes.js';
import { ReputationService } from './reputation.service.js';

type ReputationModuleOptions = {
  prisma: PrismaClient;
};

export async function registerReputationModule(
  fastify: FastifyInstance,
  options: ReputationModuleOptions,
): Promise<void> {
  const repository = new ReputationRepository(options.prisma);
  const service = new ReputationService(repository, options.prisma);
  const controller = new ReputationController(service);
  await registerReputationRoutes(fastify, controller);
}
