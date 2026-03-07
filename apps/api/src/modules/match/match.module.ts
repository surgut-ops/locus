import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { CacheService } from '../infrastructure/cache/cache.service.js';
import { MatchController } from './match.controller.js';
import { MatchRepository } from './match.repository.js';
import { registerMatchRoutes } from './match.routes.js';
import { MatchService } from './match.service.js';

type MatchModuleOptions = {
  prisma: PrismaClient;
};

export async function registerMatchModule(
  fastify: FastifyInstance,
  options: MatchModuleOptions,
): Promise<void> {
  const repository = new MatchRepository(options.prisma);
  const cache = new CacheService();
  const service = new MatchService(repository, cache);
  const controller = new MatchController(service);

  await registerMatchRoutes(fastify, controller);
}
