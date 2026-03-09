import type { FastifyInstance } from 'fastify';

import { AuthController } from './auth.controller.js';
import { requireAuth } from './auth.middleware.js';

export async function registerAuthRoutes(
  fastify: FastifyInstance,
  controller: AuthController,
): Promise<void> {
  fastify.post('/auth/register', async (request, reply) => {
    try {
      return await controller.register(request, reply);
    } catch (err) {
      request.log.error({ err }, 'auth/register route error');
      return reply.code(500).send({
        status: 'error',
        code: 500,
        message: err instanceof Error ? err.message : 'Register failed',
      });
    }
  });
  fastify.post('/auth/login', async (request, reply) => controller.login(request, reply));
  fastify.get('/users/me', { preHandler: requireAuth }, async (request, reply) =>
    controller.me(request, reply),
  );
}
