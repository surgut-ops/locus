import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { registerReferralModule } from '../modules/referral/referral.module.js';

type ReferralRoutesOptions = {
  prisma: PrismaClient;
  notificationsService?: import('../modules/notifications/notifications.service.js').NotificationsService;
};

export async function registerReferralModuleRoutes(
  fastify: FastifyInstance,
  options: ReferralRoutesOptions,
): Promise<import('../modules/referral/referral.service.js').ReferralService> {
  return registerReferralModule(fastify, {
    prisma: options.prisma,
    notificationsService: options.notificationsService,
  });
}
