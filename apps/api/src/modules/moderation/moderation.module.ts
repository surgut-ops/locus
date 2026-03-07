import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import type { NotificationsService } from '../notifications/notifications.service.js';
import { ModerationController } from './moderation.controller.js';
import { ModerationRepository } from './moderation.repository.js';
import { registerModerationRoutes } from './moderation.routes.js';
import { ModerationService } from './moderation.service.js';

type ModerationModuleOptions = {
  prisma: PrismaClient;
  notificationsService?: NotificationsService;
};

export async function registerModerationModule(
  fastify: FastifyInstance,
  options: ModerationModuleOptions,
): Promise<ModerationService> {
  const repository = new ModerationRepository(options.prisma);
  const service = new ModerationService(repository, options.notificationsService);
  const controller = new ModerationController(service);
  await registerModerationRoutes(fastify, controller);
  return service;
}
