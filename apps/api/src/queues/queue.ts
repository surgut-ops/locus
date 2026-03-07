import { Queue, type QueueOptions } from 'bullmq';
import IORedis from 'ioredis';

import { LoggerService } from '../modules/infrastructure/logging/logger.service.js';

/** Job type constants for background tasks */
export const JOB_TYPES = {
  IMAGE_PROCESSING: 'IMAGE_PROCESSING',
  AI_TASK: 'AI_TASK',
  SEND_NOTIFICATION: 'SEND_NOTIFICATION',
  SEND_EMAIL: 'SEND_EMAIL',
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

export type SearchIndexAction = 'indexListing' | 'updateListing' | 'removeListing';

export type ImageProcessingPayload = {
  listingId: string;
  imageId: string;
  imageUrl: string;
  mimeType?: string;
  sourceBufferBase64?: string;
};

export type AITaskPayload = {
  task: 'generateEmbeddings' | 'calculateRecommendations' | 'updateMarketAnalytics' | 'runModeration';
  listingId?: string;
  userId?: string;
  city?: string;
};

export type NotificationPayload = {
  type: 'message' | 'booking' | 'system';
  userId: string;
  title: string;
  body: string;
};

export type EmailJobPayload = {
  template: string;
  to: string;
  subject: string;
  data: Record<string, unknown>;
};

export type ImportJobPayload = {
  ownerId: string;
  source: 'csv' | 'json' | 'url';
  rawData: unknown;
};

type QueueConfigOptions = {
  redisUrl?: string;
  queuePrefix?: string;
};

let queueInstance: QueueConfig | null = null;
const logger = new LoggerService('queue');

export class QueueConfig {
  public readonly connection: IORedis;
  public readonly imageProcessingQueue: Queue<ImageProcessingPayload>;
  public readonly searchIndexingQueue: Queue<{ action: SearchIndexAction; listingId: string }>;
  public readonly aiProcessingQueue: Queue<AITaskPayload>;
  public readonly notificationsQueue: Queue<NotificationPayload>;
  public readonly emailQueue: Queue<EmailJobPayload>;
  public readonly importQueue: Queue<ImportJobPayload>;

  public constructor(options: QueueConfigOptions = {}) {
    const redisUrl = options.redisUrl ?? process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
    const prefix = options.queuePrefix ?? process.env.QUEUE_PREFIX ?? 'locus';

    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    const queueOptions: QueueOptions = {
      connection: this.connection,
      prefix,
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 1000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    };

    this.imageProcessingQueue = new Queue<ImageProcessingPayload>('image-processing', queueOptions);
    this.searchIndexingQueue = new Queue('search-indexing', queueOptions);
    this.aiProcessingQueue = new Queue<AITaskPayload>('ai-processing', queueOptions);
    this.notificationsQueue = new Queue<NotificationPayload>('notifications', queueOptions);
    this.emailQueue = new Queue<EmailJobPayload>('email', queueOptions);
    this.importQueue = new Queue<ImportJobPayload>('import', queueOptions);
  }

  public async addImageProcessingJob(payload: ImageProcessingPayload) {
    logger.debug('Queue IMAGE_PROCESSING job', payload);
    return this.imageProcessingQueue.add(JOB_TYPES.IMAGE_PROCESSING, payload);
  }

  public async addSearchIndexJob(payload: { action: SearchIndexAction; listingId: string }) {
    logger.debug('Queue search-indexing job', payload);
    return this.searchIndexingQueue.add(payload.action, payload);
  }

  public async addAIProcessingJob(payload: AITaskPayload) {
    logger.debug('Queue AI_TASK job', payload);
    return this.aiProcessingQueue.add(JOB_TYPES.AI_TASK, payload);
  }

  public async addNotificationJob(payload: NotificationPayload) {
    logger.debug('Queue SEND_NOTIFICATION job', payload);
    return this.notificationsQueue.add(JOB_TYPES.SEND_NOTIFICATION, payload);
  }

  public async addEmailJob(payload: EmailJobPayload) {
    logger.debug('Queue SEND_EMAIL job', { to: payload.to, template: payload.template });
    return this.emailQueue.add(JOB_TYPES.SEND_EMAIL, payload);
  }

  public async addImportJob(payload: ImportJobPayload) {
    logger.debug('Queue IMPORT job', { source: payload.source, ownerId: payload.ownerId });
    return this.importQueue.add('IMPORT', payload);
  }

  public async getQueueStatus() {
    const [image, search, ai, notifications, email, importQ] = await Promise.all([
      this.imageProcessingQueue.getJobCounts(),
      this.searchIndexingQueue.getJobCounts(),
      this.aiProcessingQueue.getJobCounts(),
      this.notificationsQueue.getJobCounts(),
      this.emailQueue.getJobCounts(),
      this.importQueue.getJobCounts(),
    ]);

    return {
      imageProcessing: { name: 'image-processing', ...image },
      searchIndexing: { name: 'search-indexing', ...search },
      aiProcessing: { name: 'ai-processing', ...ai },
      notifications: { name: 'notifications', ...notifications },
      email: { name: 'email', ...email },
      import: { name: 'import', ...importQ },
    };
  }

  /** Alias for health check compatibility */
  public async getQueueHealth() {
    const [image, search, ai, notifications, email, importQ] = await Promise.all([
      this.imageProcessingQueue.getJobCounts('waiting', 'active', 'delayed', 'failed'),
      this.searchIndexingQueue.getJobCounts('waiting', 'active', 'delayed', 'failed'),
      this.aiProcessingQueue.getJobCounts('waiting', 'active', 'delayed', 'failed'),
      this.notificationsQueue.getJobCounts('waiting', 'active', 'delayed', 'failed'),
      this.emailQueue.getJobCounts('waiting', 'active', 'delayed', 'failed'),
      this.importQueue.getJobCounts('waiting', 'active', 'delayed', 'failed'),
    ]);
    return { image, search, ai, notifications, email, import: importQ };
  }

  public async isRedisConnected(): Promise<boolean> {
    try {
      const pong = await this.connection.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }
}

export function initializeQueue(): QueueConfig {
  if (!queueInstance) {
    queueInstance = new QueueConfig();
  }
  return queueInstance;
}

export function getQueue(): QueueConfig | null {
  return queueInstance;
}
