import type Redis from 'ioredis';

import { getSharedRedis } from '../../lib/redis.client.js';
import { AIError } from './ai.types.js';

export class AIEmbeddingService {
  private readonly redis: Redis | null;
  private readonly fallback = new Map<string, number[]>();

  public constructor() {
    this.redis = getSharedRedis();
  }

  public async createListingEmbedding(listingId: string, title: string, description: string): Promise<number[]> {
    if (!listingId.trim()) {
      throw new AIError('listingId is required', 400);
    }

    const vector = await this.requestEmbedding(`${title}\n${description}`);
    const key = this.embeddingKey(listingId);

    if (this.redis) {
      await this.redis.set(key, JSON.stringify(vector), 'EX', 60 * 60 * 24 * 30);
    } else {
      this.fallback.set(key, vector);
    }

    return vector;
  }

  public async getListingEmbedding(listingId: string): Promise<number[] | null> {
    const key = this.embeddingKey(listingId);
    if (this.redis) {
      const value = await this.redis.get(key);
      if (!value) {
        return null;
      }
      return this.safeParse(value);
    }
    return this.fallback.get(key) ?? null;
  }

  private async requestEmbedding(input: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AIError('OPENAI_API_KEY is missing', 500);
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input,
      }),
    });

    if (!response.ok) {
      throw new AIError('Failed to create embeddings', 502);
    }

    const json = (await response.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    const vector = json.data?.[0]?.embedding;
    if (!vector || !Array.isArray(vector)) {
      throw new AIError('Invalid embeddings response', 502);
    }
    return vector;
  }

  private safeParse(value: string): number[] | null {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'number')) {
        return null;
      }
      return parsed as number[];
    } catch {
      return null;
    }
  }

  private embeddingKey(listingId: string): string {
    return `listing:${listingId}:embedding`;
  }
}
