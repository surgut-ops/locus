import type { FastifyReply, FastifyRequest } from 'fastify';

import { TrustService } from './trust.service.js';
import { TrustError } from './trust.types.js';

type UserParams = { id: string };
type ListingParams = { id: string };

export class TrustController {
  public constructor(private readonly service: TrustService) {}

  public async getUserTrust(
    request: FastifyRequest<{ Params: UserParams }>,
    reply: FastifyReply,
  ) {
    try {
      const result = await this.service.getUserTrust(request.params.id);
      return reply.code(200).send(result);
    } catch (error) {
      return handleTrustError(reply, error);
    }
  }

  public async getListingTrust(
    request: FastifyRequest<{ Params: ListingParams }>,
    reply: FastifyReply,
  ) {
    try {
      const result = await this.service.getListingTrust(request.params.id);
      return reply.code(200).send(result);
    } catch (error) {
      return handleTrustError(reply, error);
    }
  }
}

function handleTrustError(reply: FastifyReply, error: unknown) {
  if (error instanceof TrustError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
