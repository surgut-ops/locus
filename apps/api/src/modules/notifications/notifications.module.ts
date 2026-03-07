import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { NotificationsController } from './notifications.controller.js';
import { NotificationsRepository } from './notifications.repository.js';
import { registerNotificationsRoutes } from './notifications.routes.js';
import { NotificationsService } from './notifications.service.js';

type NotificationsModuleOptions = {
  prisma: PrismaClient;
};

export async function registerNotificationsModule(
  fastify: FastifyInstance,
  options: NotificationsModuleOptions,
): Promise<NotificationsService> {
  const repository = new NotificationsRepository(options.prisma);
  const service = new NotificationsService(repository);
  const controller = new NotificationsController(service);
  await registerNotificationsRoutes(fastify, controller);
  return service;
}
