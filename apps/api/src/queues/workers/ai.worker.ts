import { Worker, type Job, type WorkerOptions } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';

import { LoggerService } from '../../modules/infrastructure/logging/logger.service.js';
import { ModerationRepository } from '../../modules/moderation/moderation.repository.js';
import { ModerationService } from '../../modules/moderation/moderation.service.js';
import { NotificationsRepository } from '../../modules/notifications/notifications.repository.js';
import { NotificationsService } from '../../modules/notifications/notifications.service.js';
import type { AITaskPayload } from '../queue.js';

const logger = new LoggerService('worker:ai');
const prisma = new PrismaClient();

export function createAIWorker(): Worker<AITaskPayload> {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const options: WorkerOptions = {
    connection: connection as never,
    prefix: process.env.QUEUE_PREFIX ?? 'locus',
    concurrency: 5,
  };

  const worker = new Worker<AITaskPayload>('ai-processing', processAIJob, options);
  worker.on('completed', (job) => logger.info('AI job completed', { jobId: job.id }));
  worker.on('failed', (job, err) =>
    logger.error('AI job failed', { jobId: job?.id ?? null, error: err.message }),
  );
  return worker;
}

async function processAIJob(job: Job<AITaskPayload>) {
  const data = job.data;

  if (data.task === 'generateEmbeddings') {
    logger.info('Generating embeddings in background', { listingId: data.listingId ?? null });
    return { task: data.task, listingId: data.listingId ?? null };
  }

  if (data.task === 'calculateRecommendations') {
    logger.info('Rebuilding recommendations in background', { userId: data.userId ?? null });
    return { task: data.task, userId: data.userId ?? null };
  }

  if (data.task === 'updateMarketAnalytics') {
    logger.info('Updating market analytics in background', { city: data.city ?? null });
    return { task: data.task, city: data.city ?? null };
  }

  if (data.task === 'runModeration' && data.listingId) {
    logger.info('Running AI moderation in background', { listingId: data.listingId });
    const moderationRepo = new ModerationRepository(prisma);
    const notificationsRepo = new NotificationsRepository(prisma);
    const notificationsService = new NotificationsService(notificationsRepo);
    const moderationService = new ModerationService(moderationRepo, notificationsService);
    const result = await moderationService.runModeration(data.listingId);
    return { task: data.task, listingId: data.listingId, moderationStatus: result.moderationStatus };
  }

  return { task: data.task };
}
