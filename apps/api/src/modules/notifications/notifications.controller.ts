import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuthenticatedUser } from '../../utils/auth.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsError } from './notifications.types.js';

type NotificationIdParams = { id: string };

export class NotificationsController {
  public constructor(private readonly service: NotificationsService) {}

  public async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = requireAuthenticatedUser(request);
      const limit = parseLimit((request.query as { limit?: string }).limit);
      const items = await this.service.getForUser(user.id, limit);
      return reply.code(200).send({ notifications: items });
    } catch (error) {
      return handleError(reply, error);
    }
  }

  public async markRead(
    request: FastifyRequest<{ Params: NotificationIdParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const user = requireAuthenticatedUser(request);
      await this.service.markAsRead(request.params.id, user.id);
      return reply.code(200).send({ success: true });
    } catch (error) {
      return handleError(reply, error);
    }
  }

  public async unreadCount(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = requireAuthenticatedUser(request);
      const count = await this.service.getUnreadCount(user.id);
      return reply.code(200).send({ count });
    } catch (error) {
      return handleError(reply, error);
    }
  }
}

function parseLimit(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 100) return undefined;
  return n;
}

function handleError(reply: FastifyReply, error: unknown) {
  if (error instanceof NotificationsError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
