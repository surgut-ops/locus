import type { FastifyInstance } from 'fastify';

import { PaymentsController } from './payments.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';

export async function registerPaymentsRoutes(
  fastify: FastifyInstance,
  controller: PaymentsController,
): Promise<void> {
  fastify.post('/payments/create', { preHandler: requireAuth }, async (request, reply) =>
    controller.createPayment(request, reply),
  );
  fastify.post('/payments/webhook', { config: { rawBody: true } }, async (request, reply) =>
    controller.webhook(request, reply),
  );
  fastify.get('/users/me/payments', { preHandler: requireAuth }, async (request, reply) =>
    controller.getMyPayments(request, reply),
  );
}
