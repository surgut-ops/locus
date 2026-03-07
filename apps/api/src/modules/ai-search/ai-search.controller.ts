import type { FastifyReply, FastifyRequest } from 'fastify';

import { AiSearchError } from './ai-search.types.js';
import { AiSearchService } from './ai-search.service.js';

export class AiSearchController {
  public constructor(private readonly service: AiSearchService) {}

  public async search(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = parseBody(request.body);
      const result = await this.service.search(body.query);
      return reply.code(200).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  }
}

function parseBody(body: unknown): { query: string } {
  if (!isObject(body)) {
    throw new AiSearchError('Invalid request body', 400);
  }
  const query = body.query;
  if (typeof query !== 'string') {
    throw new AiSearchError('Field "query" is required and must be a string', 400);
  }
  return { query: query.trim() };
}

function handleError(reply: FastifyReply, error: unknown) {
  if (error instanceof AiSearchError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
