import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../auth/auth.middleware.js';
import { ReferralController } from './referral.controller.js';

export async function registerReferralRoutes(
  fastify: FastifyInstance,
  controller: ReferralController,
): Promise<void> {
  fastify.get(
    '/referral/me',
    { preHandler: requireAuth },
    async (request, reply) => controller.getMe(request, reply),
  );
}
