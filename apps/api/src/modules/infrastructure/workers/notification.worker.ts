import { Worker, type Job, type WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';

import { LoggerService } from '../logging/logger.service.js';

type NotificationJobPayload = {
  type: 'message' | 'booking' | 'system';
  userId: string;
  title: string;
  body: string;
};

const logger = new LoggerService('worker:notification');

export function createNotificationWorker(): Worker<NotificationJobPayload> {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  const options: WorkerOptions = {
    connection: new IORedis(redisUrl, { maxRetriesPerRequest: null }),
    prefix: process.env.QUEUE_PREFIX ?? 'locus',
    concurrency: 10,
  };

  const worker = new Worker<NotificationJobPayload>('notifications', processNotificationJob, options);
  worker.on('completed', (job) => logger.info('Notification job completed', { jobId: job.id }));
  worker.on('failed', (job, err) =>
    logger.error('Notification job failed', { jobId: job?.id ?? null, error: err.message }),
  );
  return worker;
}

async function processNotificationJob(job: Job<NotificationJobPayload>) {
  const payload = job.data;
  // Placeholder for push/email integrations. Queue is now async-capable and horizontally scalable.
  logger.info('Dispatching notification', {
    type: payload.type,
    userId: payload.userId,
    title: payload.title,
  });
  return { delivered: true };
}
