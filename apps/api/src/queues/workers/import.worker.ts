import { Worker, type Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';

import { LoggerService } from '../../modules/infrastructure/logging/logger.service.js';
import { ImportRepository } from '../../modules/import/import.repository.js';
import { ImportService } from '../../modules/import/import.service.js';
import type { ImportJobPayload } from '../../queues/queue.js';

const prisma = new PrismaClient();
const repository = new ImportRepository(prisma);
const service = new ImportService(repository);
const logger = new LoggerService('worker:import');

export function createImportWorker() {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  const worker = new Worker<ImportJobPayload>(
    'import',
    processImportJob,
    {
      connection: new IORedis(redisUrl, { maxRetriesPerRequest: null }),
      prefix: process.env.QUEUE_PREFIX ?? 'locus',
      concurrency: 1,
    },
  );
  worker.on('completed', (job) =>
    logger.info('Import job completed', { jobId: job.id }),
  );
  worker.on('failed', (job, err) =>
    logger.error('Import job failed', { jobId: job?.id ?? null, error: err?.message }),
  );
  return worker;
}

async function processImportJob(job: Job<ImportJobPayload>) {
  const payload = job.data;
  logger.info('Processing import job', {
    jobId: job.id,
    source: payload.source,
    ownerId: payload.ownerId,
  });
  const result = await service.processImportJob(payload);
  logger.info('Import job result', { jobId: job.id, created: result.created });
  return result;
}
