import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { registerAdminController } from './admin.controller.js';
import { AdminAnalyticsService } from './admin.analytics.service.js';
import { AdminAuditService } from './admin.audit.service.js';
import { AdminRepository } from './admin.repository.js';
import { AdminService } from './admin.service.js';

type AdminModuleOptions = {
  prisma: PrismaClient;
};

export async function registerAdminModule(
  fastify: FastifyInstance,
  options: AdminModuleOptions,
): Promise<void> {
  const repository = new AdminRepository(options.prisma);
  const analytics = new AdminAnalyticsService(repository);
  const audit = new AdminAuditService();
  const service = new AdminService(repository, analytics, audit);

  await registerAdminController(fastify, service);
}
