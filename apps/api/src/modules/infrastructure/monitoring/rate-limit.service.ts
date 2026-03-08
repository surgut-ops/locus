import type Redis from 'ioredis';

import { getSharedRedis } from '../../lib/redis.client.js';

export class RateLimitService {
  private readonly redis: Redis | null;
  private readonly fallback = new Map<string, { count: number; expiresAt: number }>();

  public constructor() {
    this.redis = getSharedRedis();
  }

  public async checkLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    if (this.redis) {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, windowSeconds);
      }
      const remaining = Math.max(0, limit - count);
      return { allowed: count <= limit, remaining };
    }

    const now = Date.now();
    const item = this.fallback.get(key);
    if (!item || item.expiresAt < now) {
      this.fallback.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
      return { allowed: true, remaining: limit - 1 };
    }

    item.count += 1;
    const remaining = Math.max(0, limit - item.count);
    return { allowed: item.count <= limit, remaining };
  }
}

export function resolveRateLimitByPath(path: string): { limit: number; windowSeconds: number } | null {
  if (path.startsWith('/search') || path.startsWith('/ai/search')) {
    return { limit: 100, windowSeconds: 60 };
  }
  if (path.startsWith('/messages') || path.startsWith('/conversations')) {
    return { limit: 30, windowSeconds: 60 };
  }
  if (path.startsWith('/auth/login') || path.startsWith('/login')) {
    return { limit: 10, windowSeconds: 60 };
  }
  return null;
}
