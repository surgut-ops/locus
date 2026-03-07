import { randomBytes, randomUUID } from 'node:crypto';
import Redis from 'ioredis';

import { GrowthError } from './growth.types.js';

type ReferralRecord = {
  code: string;
  referrerId: string;
  createdAt: string;
};

type RedemptionRecord = {
  id: string;
  code: string;
  referrerId: string;
  redeemedBy: string;
  rewardPoints: number;
  createdAt: string;
};

export class ReferralService {
  private readonly redis: Redis | null;
  private readonly fallbackCodes = new Map<string, ReferralRecord>();
  private readonly fallbackByUser = new Map<string, string>();
  private readonly fallbackRedemptions: RedemptionRecord[] = [];

  public constructor() {
    const redisUrl = process.env.REDIS_URL ?? null;
    this.redis = redisUrl ? new Redis(redisUrl) : null;
  }

  public async getReferralLink(userId: string): Promise<{ code: string; link: string }> {
    if (!userId.trim()) {
      throw new GrowthError('userId is required', 400);
    }

    const existing = await this.getCodeByUser(userId);
    const code = existing ?? this.generateCode();

    if (!existing) {
      await this.saveCode({
        code,
        referrerId: userId,
        createdAt: new Date().toISOString(),
      });
      await this.saveUserCode(userId, code);
    }

    const baseUrl = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    return {
      code,
      link: `${baseUrl.replace(/\/+$/, '')}/signup?ref=${encodeURIComponent(code)}`,
    };
  }

  public async redeem(code: string, newUserId: string): Promise<{ success: true; rewardPoints: number }> {
    if (!code.trim() || !newUserId.trim()) {
      throw new GrowthError('code and userId are required', 400);
    }

    const referral = await this.getCode(code.trim());
    if (!referral) {
      throw new GrowthError('Referral code not found', 404);
    }
    if (referral.referrerId === newUserId) {
      throw new GrowthError('Cannot redeem own referral code', 400);
    }

    const alreadyRedeemed = await this.hasUserRedeemed(newUserId);
    if (alreadyRedeemed) {
      throw new GrowthError('User already redeemed a referral code', 409);
    }

    const rewardPoints = 100;
    await this.saveRedemption({
      id: randomUUID(),
      code: referral.code,
      referrerId: referral.referrerId,
      redeemedBy: newUserId,
      rewardPoints,
      createdAt: new Date().toISOString(),
    });

    return { success: true, rewardPoints };
  }

  private generateCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  private async saveCode(record: ReferralRecord): Promise<void> {
    if (this.redis) {
      await this.redis.set(`growth:referral:code:${record.code}`, JSON.stringify(record), 'EX', 60 * 60 * 24 * 365);
      return;
    }
    this.fallbackCodes.set(record.code, record);
  }

  private async getCode(code: string): Promise<ReferralRecord | null> {
    if (this.redis) {
      const raw = await this.redis.get(`growth:referral:code:${code}`);
      if (!raw) {
        return null;
      }
      try {
        return JSON.parse(raw) as ReferralRecord;
      } catch {
        return null;
      }
    }
    return this.fallbackCodes.get(code) ?? null;
  }

  private async saveUserCode(userId: string, code: string): Promise<void> {
    if (this.redis) {
      await this.redis.set(`growth:referral:user:${userId}`, code, 'EX', 60 * 60 * 24 * 365);
      return;
    }
    this.fallbackByUser.set(userId, code);
  }

  private async getCodeByUser(userId: string): Promise<string | null> {
    if (this.redis) {
      return this.redis.get(`growth:referral:user:${userId}`);
    }
    return this.fallbackByUser.get(userId) ?? null;
  }

  private async hasUserRedeemed(userId: string): Promise<boolean> {
    if (this.redis) {
      return (await this.redis.exists(`growth:referral:redeemed:${userId}`)) === 1;
    }
    return this.fallbackRedemptions.some((item) => item.redeemedBy === userId);
  }

  private async saveRedemption(redemption: RedemptionRecord): Promise<void> {
    if (this.redis) {
      await this.redis.set(
        `growth:referral:redeemed:${redemption.redeemedBy}`,
        JSON.stringify(redemption),
        'EX',
        60 * 60 * 24 * 365,
      );
      await this.redis.lpush('growth:referral:redemptions', JSON.stringify(redemption));
      await this.redis.ltrim('growth:referral:redemptions', 0, 5000);
      return;
    }
    this.fallbackRedemptions.unshift(redemption);
  }
}
