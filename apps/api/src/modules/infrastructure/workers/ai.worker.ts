import { Worker, type Job, type WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';

import { LoggerService } from '../logging/logger.service.js';

type AIJobPayload = {
  task: 'generateEmbeddings' | 'calculateRecommendations' | 'updateMarketAnalytics';
  listingId?: string;
  userId?: string;
  city?: string;
};

const logger = new LoggerService('worker:ai');

export function createAIWorker(): Worker<AIJobPayload> {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  const options: WorkerOptions = {
    connection: new IORedis(redisUrl, { maxRetriesPerRequest: null }),
    prefix: process.env.QUEUE_PREFIX ?? 'locus',
    concurrency: 5,
  };

  const worker = new Worker<AIJobPayload>('ai-processing', processAIJob, options);
  worker.on('completed', (job) => logger.info('AI job completed', { jobId: job.id }));
  worker.on('failed', (job, err) =>
    logger.error('AI job failed', { jobId: job?.id ?? null, error: err.message }),
  );
  return worker;
}

async function processAIJob(job: Job<AIJobPayload>) {
  const data = job.data;

  if (data.task === 'generateEmbeddings') {
    logger.info('Generating embeddings in background', { listingId: data.listingId ?? null });
    return { task: data.task, listingId: data.listingId ?? null };
  }

  if (data.task === 'calculateRecommendations') {
    logger.info('Rebuilding recommendations in background', { userId: data.userId ?? null });
    return { task: data.task, userId: data.userId ?? null };
  }

  logger.info('Updating market analytics in background', { city: data.city ?? null });
  return { task: data.task, city: data.city ?? null };
}
