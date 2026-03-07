import type { FastifyReply, FastifyRequest } from 'fastify';

import { ReputationService } from './reputation.service.js';
import { ReputationError } from './reputation.types.js';

type UserParams = { id: string };

export class ReputationController {
  public constructor(private readonly service: ReputationService) {}

  public async getUserReputation(
    request: FastifyRequest<{ Params: UserParams }>,
    reply: FastifyReply,
  ) {
    try {
      const result = await this.service.getUserReputation(request.params.id);
      return reply.code(200).send(result);
    } catch (error) {
      return handleReputationError(reply, error);
    }
  }
}

function handleReputationError(reply: FastifyReply, error: unknown) {
  if (error instanceof ReputationError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
