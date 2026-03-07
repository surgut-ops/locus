import type { FastifyInstance } from 'fastify';

import { AiListingController } from '../modules/ai-listing/ai-listing.controller.js';
import { AiListingService } from '../modules/ai-listing/ai-listing.service.js';
import { registerAiListingRoutes } from '../modules/ai-listing/ai-listing.routes.js';

export async function registerAiListingModuleRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new AiListingService();
  const controller = new AiListingController(service);
  await registerAiListingRoutes(fastify, controller);
}
