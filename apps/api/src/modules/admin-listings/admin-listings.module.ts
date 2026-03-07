import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { registerAdminListingsController } from './admin-listings.controller.js';
import { AdminListingsRepository } from './admin-listings.repository.js';
import { AdminListingsService } from './admin-listings.service.js';

type AdminListingsModuleOptions = {
  prisma: PrismaClient;
};

export async function registerAdminListingsModule(
  fastify: FastifyInstance,
  options: AdminListingsModuleOptions,
): Promise<void> {
  const repository = new AdminListingsRepository(options.prisma);
  const service = new AdminListingsService(repository);
  await registerAdminListingsController(fastify, service);
}
