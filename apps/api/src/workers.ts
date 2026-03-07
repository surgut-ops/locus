import { LoggerService } from './modules/infrastructure/logging/logger.service.js';
import { startQueuesWorkers } from './queues/workers/index.js';

const logger = new LoggerService('workers');

const start = async () => {
  try {
    startQueuesWorkers();
    logger.info('Queue workers started', {
      workers: ['image', 'search', 'ai', 'notifications', 'email'],
    });
  } catch (error) {
    logger.error('Failed to start workers', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    process.exit(1);
  }
};

void start();
