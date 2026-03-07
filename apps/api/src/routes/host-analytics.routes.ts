import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { registerHostAnalyticsModule } from '../modules/host-analytics/host-analytics.module.js';

type HostAnalyticsRoutesOptions = { prisma: PrismaClient };

export async function registerHostAnalyticsModuleRoutes(
  fastify: FastifyInstance,
  options: HostAnalyticsRoutesOptions,
): Promise<void> {
  await registerHostAnalyticsModule(fastify, { prisma: options.prisma });
}
