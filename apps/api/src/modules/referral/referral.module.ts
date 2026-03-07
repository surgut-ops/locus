import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import type { NotificationsService } from '../notifications/notifications.service.js';
import { ReferralController } from './referral.controller.js';
import { ReferralRepository } from './referral.repository.js';
import { registerReferralRoutes } from './referral.routes.js';
import { ReferralService } from './referral.service.js';

type ReferralModuleOptions = {
  prisma: PrismaClient;
  notificationsService?: NotificationsService;
  baseUrl?: string;
};

export async function registerReferralModule(
  fastify: FastifyInstance,
  options: ReferralModuleOptions,
): Promise<ReferralService> {
  const baseUrl = options.baseUrl ?? process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const repository = new ReferralRepository(options.prisma);
  const service = new ReferralService(
    repository,
    baseUrl,
    options.notificationsService,
  );
  const controller = new ReferralController(service);

  await registerReferralRoutes(fastify, controller);
  return service;
}
