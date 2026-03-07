import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../auth/auth.middleware.js';
import { ImportController } from './import.controller.js';

export async function registerImportRoutes(
  fastify: FastifyInstance,
  controller: ImportController,
): Promise<void> {
  fastify.post<{ Body: { csv?: string } }>(
    '/import/csv',
    { preHandler: requireAuth },
    async (request, reply) => controller.importCsv(request, reply),
  );
  fastify.post<{ Body: { items?: unknown[] } }>(
    '/import/json',
    { preHandler: requireAuth },
    async (request, reply) => controller.importJson(request, reply),
  );
  fastify.post<{ Body: { url?: string } }>(
    '/import/url',
    { preHandler: requireAuth },
    async (request, reply) => controller.importUrl(request, reply),
  );
}
