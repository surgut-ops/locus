import type { FastifyInstance } from 'fastify';

import { AuthController } from './auth.controller.js';
import { requireAuth } from './auth.middleware.js';

export async function registerAuthRoutes(
  fastify: FastifyInstance,
  controller: AuthController,
): Promise<void> {
  fastify.post('/auth/register', async (request, reply) => controller.register(request, reply));
  fastify.post('/auth/login', async (request, reply) => controller.login(request, reply));
  fastify.get('/users/me', { preHandler: requireAuth }, async (request, reply) =>
    controller.me(request, reply),
  );
}
