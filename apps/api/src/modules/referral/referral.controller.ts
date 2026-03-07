import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AuthenticatedUser } from '../../utils/auth.js';
import { ReferralService } from './referral.service.js';

export class ReferralController {
  public constructor(private readonly service: ReferralService) {}

  public async getMe(request: FastifyRequest, reply: FastifyReply) {
    const actor = request.user as AuthenticatedUser;
    const result = await this.service.getMe(actor);
    return reply.send(result);
  }
}
