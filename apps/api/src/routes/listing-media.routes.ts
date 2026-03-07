import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { ListingMediaController } from '../modules/listing-media/media.controller.js';
import { ListingMediaRepository } from '../modules/listing-media/media.repository.js';
import { registerListingMediaRoutes } from '../modules/listing-media/media.routes.js';
import { ListingMediaService, ListingMediaStorage } from '../modules/listing-media/media.service.js';

type ListingMediaRoutesOptions = {
  prisma: PrismaClient;
};

export async function registerListingMediaModuleRoutes(
  fastify: FastifyInstance,
  options: ListingMediaRoutesOptions,
): Promise<void> {
  const repository = new ListingMediaRepository(options.prisma);
  const storage = new ListingMediaStorage();
  const service = new ListingMediaService(repository, storage);
  const controller = new ListingMediaController(service);
  await registerListingMediaRoutes(fastify, controller);
}
