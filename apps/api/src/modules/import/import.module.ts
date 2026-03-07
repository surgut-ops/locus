import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { ImportController } from './import.controller.js';
import { ImportRepository } from './import.repository.js';
import { registerImportRoutes } from './import.routes.js';
import { ImportService } from './import.service.js';

type ImportModuleOptions = {
  prisma: PrismaClient;
};

export async function registerImportModule(
  fastify: FastifyInstance,
  options: ImportModuleOptions,
): Promise<void> {
  const repository = new ImportRepository(options.prisma);
  const service = new ImportService(repository);
  const controller = new ImportController(service);

  await registerImportRoutes(fastify, controller);
}
