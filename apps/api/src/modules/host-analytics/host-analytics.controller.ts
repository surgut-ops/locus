import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuthenticatedUser } from '../../utils/auth.js';
import { HostAnalyticsService } from './host-analytics.service.js';
import { HostAnalyticsError } from './host-analytics.types.js';

export class HostAnalyticsController {
  public constructor(private readonly service: HostAnalyticsService) {}

  public async getDashboard(request: FastifyRequest, reply: FastifyReply) {
    try {
      const actor = requireAuthenticatedUser(request);
      const result = await this.service.getDashboard(actor);
      return reply.code(200).send(result);
    } catch (error) {
      if (error instanceof HostAnalyticsError) {
        return reply.code(error.statusCode).send({ message: error.message });
      }
      return reply.code(500).send({ message: 'Internal server error' });
    }
  }
}
