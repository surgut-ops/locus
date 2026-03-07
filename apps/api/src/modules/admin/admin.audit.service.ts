import { randomUUID } from 'node:crypto';

import Redis from 'ioredis';

type AuditAction =
  | 'user_blocked'
  | 'user_unblocked'
  | 'listing_removed'
  | 'listing_approved'
  | 'listing_blocked'
  | 'booking_cancelled'
  | 'report_resolved'
  | 'moderation_action';

type AuditEntry = {
  id: string;
  action: AuditAction;
  actorId: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export class AdminAuditService {
  private readonly redis: Redis | null;
  private readonly fallback: AuditEntry[] = [];
  private readonly key = 'admin:audit:logs';

  public constructor() {
    const redisUrl = process.env.REDIS_URL ?? null;
    this.redis = redisUrl ? new Redis(redisUrl) : null;
  }

  public async log(entry: Omit<AuditEntry, 'id' | 'createdAt'>): Promise<void> {
    const payload: AuditEntry = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...entry,
    };

    if (this.redis) {
      await this.redis.lpush(this.key, JSON.stringify(payload));
      await this.redis.ltrim(this.key, 0, 999);
      await this.redis.expire(this.key, 60 * 60 * 24 * 90);
      return;
    }

    this.fallback.unshift(payload);
    this.fallback.splice(1000);
  }

  public async getRecent(limit = 50): Promise<AuditEntry[]> {
    if (this.redis) {
      const rows = await this.redis.lrange(this.key, 0, Math.max(0, limit - 1));
      return rows
        .map((row) => this.safeParse(row))
        .filter((row): row is AuditEntry => row !== null);
    }
    return this.fallback.slice(0, limit);
  }

  private safeParse(value: string): AuditEntry | null {
    try {
      return JSON.parse(value) as AuditEntry;
    } catch {
      return null;
    }
  }
}
