import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuthError, requireAuthenticatedUser } from '../../utils/auth.js';
import { ListingMediaError } from './media.types.js';
import { ListingMediaService } from './media.service.js';

type ListingParams = {
  id: string;
};

type ImageParams = {
  id: string;
};

export class ListingMediaController {
  public constructor(private readonly service: ListingMediaService) {}

  public async upload(
    request: FastifyRequest<{ Params: ListingParams }>,
    reply: FastifyReply,
  ) {
    try {
      const actor = requireAuthenticatedUser(request);
      const file = await request.file();
      if (!file || file.type !== 'file') {
        throw new ListingMediaError('Image file is required', 400);
      }

      const created = await this.service.uploadImage(actor, request.params.id, {
        filename: file.filename,
        mimeType: file.mimetype,
        buffer: await file.toBuffer(),
      });

      return reply.code(201).send(created);
    } catch (error) {
      return handleMediaError(reply, error);
    }
  }

  public async list(
    request: FastifyRequest<{ Params: ListingParams }>,
    reply: FastifyReply,
  ) {
    try {
      const images = await this.service.listImages(request.params.id);
      return reply.code(200).send(images);
    } catch (error) {
      return handleMediaError(reply, error);
    }
  }

  public async delete(
    request: FastifyRequest<{ Params: ImageParams }>,
    reply: FastifyReply,
  ) {
    try {
      const actor = requireAuthenticatedUser(request);
      const result = await this.service.deleteImage(actor, request.params.id);
      return reply.code(200).send(result);
    } catch (error) {
      return handleMediaError(reply, error);
    }
  }
}

function handleMediaError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof ListingMediaError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
