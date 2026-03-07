import type { FastifyReply, FastifyRequest } from 'fastify';

import { HeatmapService } from './heatmap.service.js';
import { HeatmapError } from './heatmap.types.js';

type Params = { city: string };

export class HeatmapController {
  public constructor(private readonly service: HeatmapService) {}

  public async getCityHeatmap(
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply,
  ) {
    try {
      const { city } = request.params;
      const decodedCity = decodeURIComponent(city);
      const result = await this.service.getCityHeatmap(decodedCity);
      return reply.code(200).send(result);
    } catch (error) {
      if (error instanceof HeatmapError) {
        return reply.code(error.statusCode).send({ message: error.message });
      }
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }
}
