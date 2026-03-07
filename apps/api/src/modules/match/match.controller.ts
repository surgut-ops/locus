import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuthError, requireAuthenticatedUser } from '../../utils/auth.js';
import { MatchService } from './match.service.js';
import { MatchError } from './match.types.js';

export class MatchController {
  public constructor(private readonly service: MatchService) {}

  public async getRecommendations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actor = requireAuthenticatedUser(request);
      const q = (request.query ?? {}) as { limit?: string };
      const limit = q.limit ? Math.min(parseInt(q.limit, 10) || 12, 24) : 12;
      const result = await this.service.getRecommendations(actor.id, limit);
      return reply.code(200).send(result);
    } catch (error) {
      return handleMatchError(reply, error);
    }
  }
}

function handleMatchError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof MatchError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
