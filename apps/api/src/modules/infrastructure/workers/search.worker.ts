import { Worker, type Job, type WorkerOptions } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';

import { LoggerService } from '../logging/logger.service.js';
import { SearchClient } from '../../search/search.client.js';
import { SearchRepository } from '../../search/search.repository.js';

type SearchJobPayload = {
  action: 'indexListing' | 'updateListing' | 'removeListing';
  listingId: string;
};

const logger = new LoggerService('worker:search');
const prisma = new PrismaClient();
const searchClient = new SearchClient();
const searchRepository = new SearchRepository(prisma);

export function createSearchWorker(): Worker<SearchJobPayload> {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const options: WorkerOptions = {
    connection: connection as never,
    prefix: process.env.QUEUE_PREFIX ?? 'locus',
    concurrency: 10,
  };

  const worker = new Worker<SearchJobPayload>('search-indexing', processSearchJob, options);
  worker.on('completed', (job) => logger.info('Search job completed', { jobId: job.id }));
  worker.on('failed', (job, err) =>
    logger.error('Search job failed', { jobId: job?.id ?? null, error: err.message }),
  );
  return worker;
}

async function processSearchJob(job: Job<SearchJobPayload>) {
  if (!searchClient.isEnabled()) {
    logger.warn('MEILISEARCH_HOST missing, skipping indexing');
    return { skipped: true };
  }

  if (job.data.action === 'removeListing') {
    await searchClient.deleteListingDocument(job.data.listingId);
    return { removed: true, listingId: job.data.listingId };
  }

  const listing = await searchRepository.getListingForIndex(job.data.listingId);
  if (!listing) {
    await searchClient.deleteListingDocument(job.data.listingId);
    return { removedMissing: true, listingId: job.data.listingId };
  }

  const document = searchRepository.toSearchDocument(listing);
  await searchClient.upsertListingDocument(document);

  return { action: job.data.action, listingId: job.data.listingId };
}
