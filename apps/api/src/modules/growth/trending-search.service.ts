import Redis from 'ioredis';

export class TrendingSearchService {
  private readonly redis: Redis | null;
  private readonly fallbackCounts = new Map<string, number>();

  public constructor() {
    const redisUrl = process.env.REDIS_URL ?? null;
    this.redis = redisUrl ? new Redis(redisUrl) : null;
  }

  public async trackQuery(rawQuery: string): Promise<void> {
    const query = normalizeQuery(rawQuery);
    if (!query) {
      return;
    }

    const key = `growth:trending-searches`;
    if (this.redis) {
      await this.redis.zincrby(key, 1, query);
      await this.redis.expire(key, 60 * 60 * 24 * 30);
      return;
    }

    const current = this.fallbackCounts.get(query) ?? 0;
    this.fallbackCounts.set(query, current + 1);
  }

  public async getTrending(limit = 10): Promise<Array<{ query: string; count: number }>> {
    if (this.redis) {
      const rows = await this.redis.zrevrange('growth:trending-searches', 0, Math.max(0, limit - 1), 'WITHSCORES');
      const result: Array<{ query: string; count: number }> = [];
      for (let index = 0; index < rows.length; index += 2) {
        const query = rows[index];
        const count = Number(rows[index + 1] ?? '0');
        result.push({ query, count });
      }
      return result;
    }

    return Array.from(this.fallbackCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 120);
}
