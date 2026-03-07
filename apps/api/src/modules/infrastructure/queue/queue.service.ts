import {
  getQueue,
  initializeQueue,
  type AITaskPayload,
  type EmailJobPayload,
  type ImageProcessingPayload,
  type NotificationPayload,
  type SearchIndexAction,
} from '../../../queues/queue.js';

export type { EmailJobPayload, SearchIndexAction } from '../../../queues/queue.js';

let queueServiceSingleton: ReturnType<typeof initializeQueue> | null = null;

export type QueueService = ReturnType<typeof initializeQueue>;

export function initializeQueueService(): QueueService {
  if (!queueServiceSingleton) {
    queueServiceSingleton = initializeQueue();
  }
  return queueServiceSingleton;
}

export function getQueueService(): QueueService | null {
  return queueServiceSingleton;
}
