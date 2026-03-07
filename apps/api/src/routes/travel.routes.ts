import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { registerTravelModule } from '../modules/travel/travel.module.js';

type TravelRoutesOptions = {
  prisma: PrismaClient;
};

export async function registerTravelModuleRoutes(
  fastify: FastifyInstance,
  options: TravelRoutesOptions,
): Promise<void> {
  await registerTravelModule(fastify, { prisma: options.prisma });
}
