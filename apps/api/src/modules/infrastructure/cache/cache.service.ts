import type Redis from 'ioredis';

import { getSharedRedis } from '../../lib/redis.client.js';

/** TTL in seconds for cached data */
export const CACHE_TTL = {
  SEARCH_RESULTS: 60,
  LISTING_DETAILS: 5 * 60,
  RECOMMENDATIONS: 5 * 60,
  AI_SEARCH: 120,
  MATCH_RECOMMENDATIONS: 5 * 60,
} as const;

export class CacheService {
  private readonly redis: Redis | null;
  private readonly fallback = new Map<string, { value: string; expiresAt: number }>();

  public constructor() {
    this.redis = getSharedRedis();
  }

  public async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      const raw = await this.redis.get(key);
      if (!raw) {
        return null;
      }
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    }

    const item = this.fallback.get(key);
    if (!item) {
      return null;
    }
    if (Date.now() > item.expiresAt) {
      this.fallback.delete(key);
      return null;
    }
    try {
      return JSON.parse(item.value) as T;
    } catch {
      return null;
    }
  }

  public async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (this.redis) {
      await this.redis.set(key, serialized, 'EX', ttlSeconds);
      return;
    }
    this.fallback.set(key, { value: serialized, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  public async delete(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(key);
      return;
    }
    this.fallback.delete(key);
  }

  public async invalidateListing(listingId: string): Promise<void> {
    await this.delete(this.keys.listingDetails(listingId));
  }

  public async invalidateRecommendations(userId: string): Promise<void> {
    if (this.redis) {
      const pattern = `cache:ai:recommendations:${userId}*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      const matchPattern = `cache:match:recommendations:${userId}*`;
      const matchKeys = await this.redis.keys(matchPattern);
      if (matchKeys.length > 0) {
        await this.redis.del(...matchKeys);
      }
      return;
    }
    for (const key of this.fallback.keys()) {
      if (
        key.startsWith(`cache:ai:recommendations:${userId}`) ||
        key.startsWith(`cache:match:recommendations:${userId}`)
      ) {
        this.fallback.delete(key);
      }
    }
  }

  public keys = {
    aiSearchResults: (queryHash: string) => `cache:ai-search:${queryHash}`,
    searchResults: (queryHash: string) => `cache:search:${queryHash}`,
    aiRecommendations: (userId: string, limit?: number) =>
      `cache:ai:recommendations:${userId}${limit != null ? `:${limit}` : ''}`,
    matchRecommendations: (userId: string, limit?: number) =>
      `cache:match:recommendations:${userId}${limit != null ? `:${limit}` : ''}`,
    listingDetails: (listingId: string) => `cache:listing:${listingId}`,
    marketAnalytics: (city: string, district?: string) =>
      `cache:market:${city}:${district && district.trim() ? district : 'all'}`,
  };
}
