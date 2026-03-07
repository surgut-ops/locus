import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import type { NotificationsService } from '../notifications/notifications.service.js';
import type { ReferralService } from '../referral/referral.service.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsRepository } from './payments.repository.js';
import { registerPaymentsRoutes } from './payments.routes.js';
import { PaymentsService } from './payments.service.js';
import { PaymentsYooKassaClient } from './payments.yookassa.js';

type PaymentsModuleOptions = {
  prisma: PrismaClient;
  notificationsService?: NotificationsService;
  referralService?: ReferralService;
};

export async function registerPaymentsModule(
  fastify: FastifyInstance,
  options: PaymentsModuleOptions,
): Promise<void> {
  const repository = new PaymentsRepository(options.prisma);
  const yookassaClient = new PaymentsYooKassaClient();
  const service = new PaymentsService(
    repository,
    yookassaClient,
    options.notificationsService,
    options.referralService,
  );
  const controller = new PaymentsController(service);

  await registerPaymentsRoutes(fastify, controller);
}
