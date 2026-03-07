import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../auth/auth.middleware.js';
import { ImportController } from './import.controller.js';

export async function registerImportRoutes(
  fastify: FastifyInstance,
  controller: ImportController,
): Promise<void> {
  fastify.post(
    '/import/csv',
    { preHandler: requireAuth },
    async (request, reply) => controller.importCsv(request, reply),
  );
  fastify.post(
    '/import/json',
    { preHandler: requireAuth },
    async (request, reply) => controller.importJson(request, reply),
  );
  fastify.post(
    '/import/url',
    { preHandler: requireAuth },
    async (request, reply) => controller.importUrl(request, reply),
  );
}
