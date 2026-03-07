import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuthError, requireAuthenticatedUser } from '../../utils/auth.js';
import { AiListingService } from './ai-listing.service.js';
import { AiListingError } from './ai-listing.types.js';

export class AiListingController {
  public constructor(private readonly service: AiListingService) {}

  public async analyze(request: FastifyRequest, reply: FastifyReply) {
    try {
      requireAuthenticatedUser(request);
      const file = await request.file();
      if (!file || file.type !== 'file') {
        throw new AiListingError('Image file is required (field: image)', 400);
      }

      const buffer = await file.toBuffer();
      const mimeType = file.mimetype || 'image/jpeg';

      const result = await this.service.analyzeImage(buffer, mimeType);
      return reply.code(200).send(result);
    } catch (error) {
      return handleAiListingError(reply, error);
    }
  }
}

function handleAiListingError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof AiListingError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
