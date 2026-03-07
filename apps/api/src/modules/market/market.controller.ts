import type { FastifyReply, FastifyRequest } from 'fastify';

import { MarketService } from './market.service.js';
import { MarketError } from './market.types.js';

type Params = { id: string };

export class MarketController {
  public constructor(private readonly service: MarketService) {}

  public async getListingInsight(
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply,
  ) {
    try {
      const { id } = request.params;
      const insight = await this.service.getListingMarketInsight(id);
      return reply.code(200).send(insight);
    } catch (error) {
      if (error instanceof MarketError) {
        return reply.code(error.statusCode).send({ message: error.message });
      }
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }
}
