import type { FastifyReply, FastifyRequest } from 'fastify';

import { TravelService } from './travel.service.js';
import { TravelError } from './travel.types.js';

type Body = { place?: string; radiusKm?: number; limit?: number };

export class TravelController {
  public constructor(private readonly service: TravelService) {}

  public async search(request: FastifyRequest<{ Body: Body }>, reply: FastifyReply) {
    try {
      const body = (request.body ?? {}) as Body;
      const result = await this.service.search({
        place: body.place ?? '',
        radiusKm: body.radiusKm,
        limit: body.limit,
      });
      return reply.code(200).send(result);
    } catch (error) {
      if (error instanceof TravelError) {
        return reply.code(error.statusCode).send({ message: error.message });
      }
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }
}
