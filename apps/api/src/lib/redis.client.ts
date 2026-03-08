import Redis from 'ioredis';

let sharedClient: Redis | null = null;

/**
 * Shared Redis client to avoid "max number of clients reached" on free tiers.
 * Use this for cache, session, rate-limit, monitoring — NOT for BullMQ (it needs its own).
 */
export function getSharedRedis(): Redis | null {
  if (!process.env.REDIS_URL?.trim()) {
    return null;
  }
  if (!sharedClient) {
    sharedClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });
  }
  return sharedClient;
}
