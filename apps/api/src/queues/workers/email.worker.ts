import { Worker, type Job, type WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';

import { EmailService } from '../../modules/email/email.service.js';
import type { EmailJobPayload as EmailPayload } from '../../modules/email/email.types.js';
import { LoggerService } from '../../modules/infrastructure/logging/logger.service.js';
import type { EmailJobPayload } from '../queue.js';

const logger = new LoggerService('worker:email');
const emailService = new EmailService();

export function createEmailWorker(): Worker<EmailJobPayload> {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const options: WorkerOptions = {
    connection: connection as never,
    prefix: process.env.QUEUE_PREFIX ?? 'locus',
    concurrency: 5,
  };

  const worker = new Worker<EmailJobPayload>('email', processEmailJob, options);
  worker.on('completed', (job) => logger.info('Email job completed', { jobId: job.id }));
  worker.on('failed', (job, err) =>
    logger.error('Email job failed', { jobId: job?.id ?? null, error: err.message }),
  );
  return worker;
}

async function processEmailJob(job: Job<EmailJobPayload>) {
  const payload = job.data;
  logger.info('Sending email', { to: payload.to, template: payload.template });
  const result = await emailService.renderAndSend(payload as EmailPayload);
  if (!result.sent && result.error) {
    throw new Error(result.error);
  }
  return result;
}
