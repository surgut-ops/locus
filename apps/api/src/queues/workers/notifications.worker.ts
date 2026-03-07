import { Worker, type Job, type WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';

import { LoggerService } from '../../modules/infrastructure/logging/logger.service.js';
import type { NotificationPayload } from '../queue.js';

const logger = new LoggerService('worker:notifications');

export function createNotificationsWorker(): Worker<NotificationPayload> {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  const options: WorkerOptions = {
    connection: new IORedis(redisUrl, { maxRetriesPerRequest: null }),
    prefix: process.env.QUEUE_PREFIX ?? 'locus',
    concurrency: 10,
  };

  const worker = new Worker<NotificationPayload>('notifications', processNotificationJob, options);
  worker.on('completed', (job) => logger.info('Notification job completed', { jobId: job.id }));
  worker.on('failed', (job, err) =>
    logger.error('Notification job failed', { jobId: job?.id ?? null, error: err.message }),
  );
  return worker;
}

async function processNotificationJob(job: Job<NotificationPayload>) {
  const payload = job.data;
  logger.info('Sending notification', {
    type: payload.type,
    userId: payload.userId,
    title: payload.title,
  });
  return { delivered: true };
}
