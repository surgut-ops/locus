import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { registerImportModule } from '../modules/import/import.module.js';

type ImportRoutesOptions = {
  prisma: PrismaClient;
};

export async function registerImportModuleRoutes(
  fastify: FastifyInstance,
  options: ImportRoutesOptions,
): Promise<void> {
  await registerImportModule(fastify, { prisma: options.prisma });
}
