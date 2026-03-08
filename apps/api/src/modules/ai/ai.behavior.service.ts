import type Redis from 'ioredis';

import { getSharedRedis } from '../../lib/redis.client.js';
import { AIError, type SearchFilters } from './ai.types.js';

type JsonValue = Record<string, unknown>;

export class AIBehaviorService {
  private readonly redis: Redis | null;
  private readonly fallbackLists = new Map<string, string[]>();
  private readonly fallbackCounters = new Map<string, number>();

  public constructor() {
    this.redis = getSharedRedis();
  }

  public async trackListingView(userId: string, listingId: string): Promise<void> {
    this.assertId(userId, 'userId is required');
    this.assertId(listingId, 'listingId is required');

    await this.pushLimited(`user:${userId}:views`, listingId, 100);
    await this.increment(`listing:${listingId}:views`);
  }

  public async trackFavorite(userId: string, listingId: string): Promise<void> {
    this.assertId(userId, 'userId is required');
    this.assertId(listingId, 'listingId is required');
    await this.pushLimited(`user:${userId}:favorites`, listingId, 100);
  }

  public async trackBookingCreated(userId: string, listingId: string): Promise<void> {
    this.assertId(userId, 'userId is required');
    this.assertId(listingId, 'listingId is required');
    await this.pushLimited(`user:${userId}:bookings`, listingId, 100);
  }

  public async trackSearch(userId: string, query: string, filters: SearchFilters | undefined): Promise<void> {
    this.assertId(userId, 'userId is required');
    if (!query.trim()) {
      throw new AIError('query is required', 400);
    }
    const payload = JSON.stringify({ query: query.trim(), filters: filters ?? {}, ts: new Date().toISOString() });
    await this.pushLimited(`user:${userId}:searches`, payload, 100);
  }

  public async getRecentViews(userId: string, limit = 20): Promise<string[]> {
    return this.getList(`user:${userId}:views`, limit);
  }

  public async getRecentFavorites(userId: string, limit = 20): Promise<string[]> {
    return this.getList(`user:${userId}:favorites`, limit);
  }

  public async getRecentBookings(userId: string, limit = 20): Promise<string[]> {
    return this.getList(`user:${userId}:bookings`, limit);
  }

  public async getRecentSearches(userId: string, limit = 20): Promise<string[]> {
    const records = await this.getList(`user:${userId}:searches`, limit);
    return records
      .map((item) => this.safeParse(item))
      .filter((item): item is { query: string } => item !== null && typeof item.query === 'string')
      .map((item) => item.query);
  }

  public async getListingViewsCount(listingId: string): Promise<number> {
    const key = `listing:${listingId}:views`;
    if (this.redis) {
      const value = await this.redis.get(key);
      return Number.parseInt(value ?? '0', 10) || 0;
    }
    return this.fallbackCounters.get(key) ?? 0;
  }

  private async pushLimited(key: string, value: string, maxItems: number): Promise<void> {
    if (this.redis) {
      await this.redis.lpush(key, value);
      await this.redis.ltrim(key, 0, maxItems - 1);
      await this.redis.expire(key, 60 * 60 * 24 * 30);
      return;
    }

    const list = this.fallbackLists.get(key) ?? [];
    list.unshift(value);
    this.fallbackLists.set(key, list.slice(0, maxItems));
  }

  private async increment(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.incr(key);
      await this.redis.expire(key, 60 * 60 * 24 * 30);
      return;
    }
    const current = this.fallbackCounters.get(key) ?? 0;
    this.fallbackCounters.set(key, current + 1);
  }

  private async getList(key: string, limit: number): Promise<string[]> {
    if (this.redis) {
      return this.redis.lrange(key, 0, Math.max(0, limit - 1));
    }
    return (this.fallbackLists.get(key) ?? []).slice(0, limit);
  }

  private safeParse(value: string): JsonValue | null {
    try {
      return JSON.parse(value) as JsonValue;
    } catch {
      return null;
    }
  }

  private assertId(value: string, message: string): void {
    if (!value || !value.trim()) {
      throw new AIError(message, 400);
    }
  }
}
