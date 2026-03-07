import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuthError, requireAuthenticatedUser } from '../../utils/auth.js';
import { PricingError } from './pricing.types.js';
import { PricingService } from './pricing.service.js';

export class PricingController {
  public constructor(private readonly service: PricingService) {}

  public async suggest(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actor = requireAuthenticatedUser(request);
      const listingId = parseListingId(request.query);
      const result = await this.service.suggestPrice(actor, listingId);
      return reply.code(200).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  }
}

function parseListingId(query: unknown): string {
  if (!isObject(query)) {
    throw new PricingError('listingId is required', 400);
  }
  const value = query.listingId;
  if (typeof value !== 'string' || !value.trim()) {
    throw new PricingError('listingId is required', 400);
  }
  return value.trim();
}

function handleError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof PricingError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
