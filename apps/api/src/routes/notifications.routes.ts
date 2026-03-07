import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { registerNotificationsModule } from '../modules/notifications/notifications.module.js';

type NotificationsRoutesOptions = {
  prisma: PrismaClient;
};

export async function registerNotificationsModuleRoutes(
  fastify: FastifyInstance,
  options: NotificationsRoutesOptions,
): Promise<import('../modules/notifications/notifications.service.js').NotificationsService> {
  return registerNotificationsModule(fastify, { prisma: options.prisma });
}
