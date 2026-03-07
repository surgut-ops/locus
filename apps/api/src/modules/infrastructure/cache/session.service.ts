import Redis from 'ioredis';

export class SessionService {
  private readonly redis: Redis | null;

  public constructor() {
    const redisUrl = process.env.REDIS_URL ?? null;
    this.redis = redisUrl ? new Redis(redisUrl) : null;
  }

  public async setSession(sessionId: string, payload: unknown, ttlSeconds = 60 * 60 * 24): Promise<void> {
    if (!this.redis) {
      return;
    }
    await this.redis.set(`session:${sessionId}`, JSON.stringify(payload), 'EX', ttlSeconds);
  }

  public async getSession<T>(sessionId: string): Promise<T | null> {
    if (!this.redis) {
      return null;
    }
    const raw = await this.redis.get(`session:${sessionId}`);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}
