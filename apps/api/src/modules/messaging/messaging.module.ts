import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import type { NotificationsService } from '../notifications/notifications.service.js';
import { registerMessagingController } from './messaging.controller.js';
import { MessagingGateway } from './messaging.gateway.js';
import { MessagingRepository } from './messaging.repository.js';
import { MessagingService } from './messaging.service.js';

type MessagingModuleOptions = {
  prisma: PrismaClient;
  notificationsService?: NotificationsService;
};

export async function registerMessagingModule(
  fastify: FastifyInstance,
  options: MessagingModuleOptions,
): Promise<void> {
  const repository = new MessagingRepository(options.prisma);
  const gateway = new MessagingGateway();
  const service = new MessagingService(repository, gateway, options.notificationsService);

  await gateway.registerWebsocket(fastify);
  await registerMessagingController(fastify, service);
}
