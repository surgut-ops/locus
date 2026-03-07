import { Worker, type Job, type WorkerOptions } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';
import sharp from 'sharp';

import { LoggerService } from '../logging/logger.service.js';
import { ListingMediaRepository } from '../../listing-media/media.repository.js';
import {
  assertImageProcessingPayload,
  ListingMediaStorage,
} from '../../listing-media/media.service.js';
import type { ListingImageProcessingPayload } from '../../listing-media/media.types.js';

const prisma = new PrismaClient();
const mediaRepository = new ListingMediaRepository(prisma);
const mediaStorage = new ListingMediaStorage();

const logger = new LoggerService('worker:image');

export function createImageWorker(): Worker<ListingImageProcessingPayload> {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  const options: WorkerOptions = {
    connection: new IORedis(redisUrl, { maxRetriesPerRequest: null }),
    prefix: process.env.QUEUE_PREFIX ?? 'locus',
    concurrency: 5,
  };

  const worker = new Worker<ListingImageProcessingPayload>('image-processing', processImageJob, options);
  worker.on('completed', (job) => logger.info('Image job completed', { jobId: job.id }));
  worker.on('failed', (job, err) =>
    logger.error('Image job failed', { jobId: job?.id ?? null, error: err.message }),
  );
  return worker;
}

async function processImageJob(job: Job<ListingImageProcessingPayload>) {
  const payload = assertImageProcessingPayload(job.data);
  logger.info('Processing image optimization', {
    listingId: payload.listingId,
    imageId: payload.imageId,
    imageUrl: payload.imageUrl,
  });

  const source = payload.sourceBufferBase64
    ? Buffer.from(payload.sourceBufferBase64, 'base64')
    : await loadImageFromUrl(payload.imageUrl);

  const metadata = await sharp(source).metadata();
  const thumbnail = await sharp(source)
    .resize({ width: 480, height: 320, fit: 'cover' })
    .webp({ quality: 76 })
    .toBuffer();
  const optimized = await sharp(source)
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const optimizedUpload = await mediaStorage.upload({
    listingId: payload.listingId,
    folder: 'optimized',
    filename: `${payload.imageId}.webp`,
    mimeType: 'image/webp',
    buffer: optimized,
  });
  const thumbnailUpload = await mediaStorage.upload({
    listingId: payload.listingId,
    folder: 'thumbnail',
    filename: `${payload.imageId}.webp`,
    mimeType: 'image/webp',
    buffer: thumbnail,
  });

  await mediaRepository.updateProcessedImage({
    imageId: payload.imageId,
    optimizedUrl: optimizedUpload.url,
    thumbnailUrl: thumbnailUpload.url,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
  });

  return {
    imageId: payload.imageId,
    thumbnailBytes: thumbnail.byteLength,
    optimizedBytes: optimized.byteLength,
    optimizedUrl: optimizedUpload.url,
    thumbnailUrl: thumbnailUpload.url,
    status: 'optimized',
  };
}

async function loadImageFromUrl(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch source image: ${response.status}`);
  }
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.startsWith('image/')) {
    throw new Error('Source file is not an image');
  }
  return Buffer.from(await response.arrayBuffer());
}
