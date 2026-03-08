import type Redis from 'ioredis';

import { getSharedRedis } from '../../../lib/redis.client.js';

import { type QueueService } from '../queue/queue.service.js';

type RouteMetric = {
  total: number;
  errors: number;
  avgResponseMs: number;
};

export class MonitoringService {
  private readonly routeMetrics = new Map<string, RouteMetric>();
  private readonly redis: Redis | null;

  public constructor() {
    this.redis = getSharedRedis();
  }

  public async markActiveUser(userId: string | undefined): Promise<void> {
    if (!userId || !this.redis) {
      return;
    }
    await this.redis.sadd('monitoring:active-users', userId);
    await this.redis.expire('monitoring:active-users', 60 * 10);
  }

  public recordResponse(path: string, responseMs: number, statusCode: number): void {
    const current = this.routeMetrics.get(path) ?? { total: 0, errors: 0, avgResponseMs: 0 };
    const total = current.total + 1;
    const errors = current.errors + (statusCode >= 500 ? 1 : 0);
    const avgResponseMs = (current.avgResponseMs * current.total + responseMs) / total;
    this.routeMetrics.set(path, { total, errors, avgResponseMs });
  }

  public async snapshot(queueService: QueueService | null) {
    const routeValues = Array.from(this.routeMetrics.values());
    const totalRequests = routeValues.reduce((sum, item) => sum + item.total, 0);
    const totalErrors = routeValues.reduce((sum, item) => sum + item.errors, 0);
    const avgApiResponseMs =
      routeValues.length > 0
        ? routeValues.reduce((sum, item) => sum + item.avgResponseMs, 0) / routeValues.length
        : 0;

    const activeUsers = this.redis ? await this.redis.scard('monitoring:active-users') : 0;
    const queueLength = queueService ? await queueService.getQueueHealth() : null;
    const memory = process.memoryUsage();

    return {
      apiResponseTimeMs: round2(avgApiResponseMs),
      errorRate: totalRequests > 0 ? round2(totalErrors / totalRequests) : 0,
      activeUsers,
      queueLength,
      memoryUsageMb: {
        rss: round2(memory.rss / 1024 / 1024),
        heapUsed: round2(memory.heapUsed / 1024 / 1024),
        heapTotal: round2(memory.heapTotal / 1024 / 1024),
      },
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
