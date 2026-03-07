import { createAIWorker } from './ai.worker.js';
import { createImageWorker } from './image.worker.js';
import { createNotificationWorker } from './notification.worker.js';
import { createSearchWorker } from './search.worker.js';

export function startInfrastructureWorkers() {
  return {
    image: createImageWorker(),
    search: createSearchWorker(),
    ai: createAIWorker(),
    notifications: createNotificationWorker(),
  };
}
