import { createAIWorker } from './ai.worker.js';
import { createEmailWorker } from './email.worker.js';
import { createImageWorker } from './image.worker.js';
import { createImportWorker } from './import.worker.js';
import { createNotificationsWorker } from './notifications.worker.js';
import { createSearchWorker } from '../../modules/infrastructure/workers/search.worker.js';

export function startQueuesWorkers() {
  return {
    image: createImageWorker(),
    search: createSearchWorker(),
    ai: createAIWorker(),
    notifications: createNotificationsWorker(),
    email: createEmailWorker(),
    import: createImportWorker(),
  };
}
