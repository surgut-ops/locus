import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../auth/auth.middleware.js';
import { NotificationsController } from './notifications.controller.js';

export async function registerNotificationsRoutes(
  fastify: FastifyInstance,
  controller: NotificationsController,
): Promise<void> {
  fastify.get(
    '/notifications',
    { preHandler: requireAuth },
    async (request, reply) => controller.list(request, reply),
  );
  fastify.get(
    '/notifications/unread-count',
    { preHandler: requireAuth },
    async (request, reply) => controller.unreadCount(request, reply),
  );
  fastify.put<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: requireAuth },
    async (request, reply) => controller.markRead(request, reply),
  );
}
