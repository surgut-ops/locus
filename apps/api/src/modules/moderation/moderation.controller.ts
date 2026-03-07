import type { FastifyReply, FastifyRequest } from 'fastify';

import { roleGuard } from '../../plugins/roleGuard.js';
import { UserRole } from '@prisma/client';
import { ModerationService } from './moderation.service.js';
import { ModerationError } from './moderation.types.js';

type ListingIdParams = { id: string };

export class ModerationController {
  public constructor(private readonly service: ModerationService) {}

  public async getPending(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const listings = await this.service.getPendingListings();
      return reply.code(200).send({ listings });
    } catch (error) {
      return handleModerationError(reply, error);
    }
  }

  public async approve(
    request: FastifyRequest<{ Params: ListingIdParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      await this.service.approve(request.params.id);
      return reply.code(200).send({ success: true });
    } catch (error) {
      return handleModerationError(reply, error);
    }
  }

  public async reject(
    request: FastifyRequest<{ Params: ListingIdParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      await this.service.reject(request.params.id);
      return reply.code(200).send({ success: true });
    } catch (error) {
      return handleModerationError(reply, error);
    }
  }
}

function handleModerationError(reply: FastifyReply, error: unknown) {
  if (error instanceof ModerationError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}

export const requireModerator = roleGuard([UserRole.ADMIN, UserRole.MODERATOR]);
