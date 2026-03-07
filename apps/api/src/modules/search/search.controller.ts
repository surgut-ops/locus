import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuthError, getAuthenticatedUser } from '../../utils/auth.js';
import { SearchError } from './search.types.js';
import { SearchService } from './search.service.js';

export class SearchController {
  public constructor(private readonly service: SearchService) {}

  public async search(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actor = getAuthenticatedUser(request);
      const result = await this.service.searchListings(request.query, actor?.id);
      return reply.code(200).send(result);
    } catch (error) {
      return handleSearchError(reply, error);
    }
  }
}

function handleSearchError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof SearchError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
