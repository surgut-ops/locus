import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { registerTrustModule } from '../modules/trust/trust.module.js';

type TrustRoutesOptions = {
  prisma: PrismaClient;
};

export async function registerTrustModuleRoutes(
  fastify: FastifyInstance,
  options: TrustRoutesOptions,
): Promise<void> {
  await registerTrustModule(fastify, { prisma: options.prisma });
}
