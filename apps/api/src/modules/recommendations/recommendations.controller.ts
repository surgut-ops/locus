import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuthError, getAuthenticatedUser } from '../../utils/auth.js';
import { RecommendationsService } from './recommendations.service.js';
import { RecommendationsError } from './recommendations.types.js';

export class RecommendationsController {
  public constructor(private readonly service: RecommendationsService) {}

  public async getRecommendations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actor = getAuthenticatedUser(request);
      const q = request.query as { limit?: string };
      const limit = q.limit ? Math.min(parseInt(q.limit, 10) || 20, 50) : 20;
      const recommendations = await this.service.getRecommendations(actor?.id, limit);
      return reply.code(200).send(recommendations);
    } catch (error) {
      return handleRecommendationsError(reply, error);
    }
  }
}

function handleRecommendationsError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof RecommendationsError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
