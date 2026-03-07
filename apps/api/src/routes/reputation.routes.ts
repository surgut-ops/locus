import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { registerReputationModule } from '../modules/reputation/reputation.module.js';

type ReputationRoutesOptions = {
  prisma: PrismaClient;
};

export async function registerReputationModuleRoutes(
  fastify: FastifyInstance,
  options: ReputationRoutesOptions,
): Promise<void> {
  await registerReputationModule(fastify, { prisma: options.prisma });
}
