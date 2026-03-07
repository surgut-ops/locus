import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import type { ReferralService } from '../referral/referral.service.js';
import { AuthController } from './auth.controller.js';
import { AuthRepository } from './auth.repository.js';
import { registerAuthRoutes } from './auth.routes.js';
import { AuthService } from './auth.service.js';

type AuthModuleOptions = {
  prisma: PrismaClient;
  referralService?: ReferralService;
};

export async function registerAuthModule(
  fastify: FastifyInstance,
  options: AuthModuleOptions,
): Promise<void> {
  const repository = new AuthRepository(options.prisma);
  const service = new AuthService(repository, options.referralService);
  const controller = new AuthController(service);

  await registerAuthRoutes(fastify, controller);
}
