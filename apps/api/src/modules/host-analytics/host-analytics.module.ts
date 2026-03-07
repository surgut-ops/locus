import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { HostAnalyticsController } from './host-analytics.controller.js';
import { HostAnalyticsRepository } from './host-analytics.repository.js';
import { registerHostAnalyticsRoutes } from './host-analytics.routes.js';
import { HostAnalyticsService } from './host-analytics.service.js';

type HostAnalyticsModuleOptions = { prisma: PrismaClient };

export async function registerHostAnalyticsModule(
  fastify: FastifyInstance,
  options: HostAnalyticsModuleOptions,
): Promise<void> {
  const repository = new HostAnalyticsRepository(options.prisma);
  const service = new HostAnalyticsService(repository);
  const controller = new HostAnalyticsController(service);
  await registerHostAnalyticsRoutes(fastify, controller);
}
