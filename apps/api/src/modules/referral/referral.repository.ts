import { type PrismaClient } from '@prisma/client';

import type { Prisma } from '@prisma/client';

const REFERRAL_CODE_LENGTH = 8;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  let result = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    result += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return result;
}

export class ReferralRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async generateUniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = generateCode();
      const existing = await this.prisma.user.findUnique({
        where: { referralCode: code },
      });
      if (!existing) return code;
    }
    return generateCode() + Date.now().toString(36).slice(-4);
  }

  public async findUserByReferralCode(code: string) {
    return this.prisma.user.findUnique({
      where: { referralCode: code },
    });
  }

  public async getUserReferralCode(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    return user?.referralCode ?? null;
  }

  public async updateUserReferralCode(userId: string, code: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });
  }

  public async createReferral(data: { referrerId: string; referredId: string }) {
    return this.prisma.referral.create({
      data,
    });
  }

  public async findReferralByReferred(referredId: string) {
    return this.prisma.referral.findFirst({
      where: { referredId },
      include: { referrer: true },
    });
  }

  public async countConfirmedBookings(guestId: string): Promise<number> {
    return this.prisma.booking.count({
      where: {
        guestId,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
    });
  }

  public async addCredit(data: {
    userId: string;
    amount: Prisma.Decimal;
    source: string;
    reference?: string;
  }) {
    return this.prisma.userCredit.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        source: data.source,
        reference: data.reference,
      },
    });
  }

  public async updateReferralRewardPaid(referralId: string) {
    return this.prisma.referral.update({
      where: { id: referralId },
      data: { rewardPaid: true },
    });
  }

  public async getReferralsByReferrer(referrerId: string) {
    return this.prisma.referral.findMany({
      where: { referrerId },
      orderBy: { createdAt: 'desc' },
      include: {
        referred: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
      },
    });
  }

  public async getTotalCredits(userId: string) {
    const result = await this.prisma.userCredit.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  public async findReferralByReferrerAndReferred(referrerId: string, referredId: string) {
    return this.prisma.referral.findUnique({
      where: {
        referrerId_referredId: { referrerId, referredId },
      },
    });
  }
}
