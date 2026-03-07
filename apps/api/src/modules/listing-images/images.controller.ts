import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { getQueueService } from '../infrastructure/queue/queue.service.js';
import { AuthError, requireAuthenticatedUser } from '../../utils/auth.js';
import { ImagesError, ImagesService } from './images.service.js';

type ListingParams = {
  id: string;
};

type ImageParams = {
  id: string;
};

type PositionBody = {
  position: unknown;
};

export async function registerImagesController(
  fastify: FastifyInstance,
  service: ImagesService,
): Promise<void> {
  fastify.post<{ Params: ListingParams }>('/listings/:id/images', async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      const files = await readMultipartFiles(request);
      const result = await service.uploadListingImages(actor, request.params.id, files);
      const queueService = getQueueService();
      if (queueService) {
        await Promise.all(
          result.items.map((item) =>
            queueService.addImageProcessingJob({
              listingId: request.params.id,
              imageId: item.id,
              imageUrl: item.url,
            }),
          ),
        );
      }
      return reply.code(201).send(result);
    } catch (error) {
      return handleImagesError(reply, error);
    }
  });

  fastify.delete<{ Params: ImageParams }>('/images/:id', async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      const result = await service.deleteImage(actor, request.params.id);
      return reply.code(200).send(result);
    } catch (error) {
      return handleImagesError(reply, error);
    }
  });

  fastify.put<{ Params: ImageParams; Body: PositionBody }>('/images/:id/position', async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      const result = await service.updateImagePosition(actor, request.params.id, request.body?.position);
      return reply.code(200).send(result);
    } catch (error) {
      return handleImagesError(reply, error);
    }
  });
}

async function readMultipartFiles(request: FastifyRequest) {
  const parts = request.files();
  const files: Array<{ filename: string; mimeType: string; buffer: Buffer }> = [];

  for await (const part of parts) {
    if (part.type !== 'file') {
      continue;
    }

    files.push({
      filename: part.filename,
      mimeType: part.mimetype,
      buffer: await part.toBuffer(),
    });
  }

  return files;
}

function handleImagesError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof ImagesError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}
