import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { registerMatchModule } from '../modules/match/match.module.js';

type MatchRoutesOptions = {
  prisma: PrismaClient;
};

export async function registerMatchModuleRoutes(
  fastify: FastifyInstance,
  options: MatchRoutesOptions,
): Promise<void> {
  await registerMatchModule(fastify, { prisma: options.prisma });
}
