import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import type { NotificationsService } from '../modules/notifications/notifications.service.js';
import { registerModerationModule } from '../modules/moderation/moderation.module.js';

type ModerationRoutesOptions = {
  prisma: PrismaClient;
  notificationsService?: NotificationsService;
};

export async function registerModerationModuleRoutes(
  fastify: FastifyInstance,
  options: ModerationRoutesOptions,
): Promise<import('../modules/moderation/moderation.service.js').ModerationService> {
  return registerModerationModule(fastify, options);
}
