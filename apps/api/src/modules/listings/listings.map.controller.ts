import type { FastifyReply, FastifyRequest } from 'fastify';

import { ListingsService } from './listings.service.js';
import { ListingsError } from './listings.types.js';

export class ListingsMapController {
  public constructor(private readonly service: ListingsService) {}

  public async getMapListings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const listings = await this.service.getListingsForMap(request.query);
      return reply.code(200).send({ listings });
    } catch (error) {
      return handleListingsMapError(reply, error);
    }
  }
}

function handleListingsMapError(reply: FastifyReply, error: unknown) {
  if (error instanceof ListingsError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
