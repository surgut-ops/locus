import { Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../../utils/auth.js';
import { ReferralRepository } from './referral.repository.js';
import { type ReferralMeResponse } from './referral.types.js';

const REFERRAL_BONUS_AMOUNT = 500;
const REFERRAL_CREDIT_SOURCE = 'referral_bonus';

export class ReferralService {
  public constructor(
    private readonly repository: ReferralRepository,
    private readonly baseUrl: string,
    private readonly notificationsService?: import('../notifications/notifications.service.js').NotificationsService,
  ) {}

  public async generateUniqueReferralCode(): Promise<string> {
    return this.repository.generateUniqueReferralCode();
  }

  public async getReferralCode(userId: string): Promise<string | null> {
    return this.repository.getUserReferralCode(userId);
  }

  public async ensureReferralCode(userId: string): Promise<string> {
    const code = await this.repository.getUserReferralCode(userId);
    if (code) return code;
    const newCode = await this.repository.generateUniqueReferralCode();
    await this.repository.updateUserReferralCode(userId, newCode);
    return newCode;
  }

  public getInviteLink(referralCode: string): string {
    const base = this.baseUrl.replace(/\/$/, '');
    return `${base}/auth/register?ref=${encodeURIComponent(referralCode)}`;
  }

  public async handleReferralOnRegistration(
    referralCode: string | undefined,
    referredUserId: string,
    referredUserName: string,
  ): Promise<void> {
    if (!referralCode?.trim()) return;
    const code = referralCode.trim().toUpperCase();
    const referrer = await this.repository.findUserByReferralCode(code);
    if (!referrer || referrer.id === referredUserId) return;
    const existing = await this.repository.findReferralByReferrerAndReferred(referrer.id, referredUserId);
    if (existing) return;
    await this.repository.createReferral({
      referrerId: referrer.id,
      referredId: referredUserId,
    });
    if (this.notificationsService) {
      await this.notificationsService
        .notifyReferralInvited(referrer.id, referredUserName)
        .catch(() => {});
    }
  }

  public async processFirstBookingReward(guestId: string, _bookingId: string): Promise<void> {
    const referral = await this.repository.findReferralByReferred(guestId);
    if (!referral || referral.rewardPaid) return;
    const confirmedCount = await this.repository.countConfirmedBookings(guestId);
    if (confirmedCount !== 1) return;
    const amount = new Prisma.Decimal(REFERRAL_BONUS_AMOUNT);
    await this.repository.addCredit({
      userId: referral.referrerId,
      amount,
      source: REFERRAL_CREDIT_SOURCE,
      reference: referral.id,
    });
    await this.repository.updateReferralRewardPaid(referral.id);
    if (this.notificationsService) {
      await this.notificationsService
        .notifyReferralBonus(referral.referrerId, String(REFERRAL_BONUS_AMOUNT))
        .catch(() => {});
    }
  }

  public async getMe(actor: AuthenticatedUser): Promise<ReferralMeResponse> {
    const code = await this.ensureReferralCode(actor.id);
    const inviteLink = this.getInviteLink(code);
    const referrals = await this.repository.getReferralsByReferrer(actor.id);
    const totalCredits = await this.repository.getTotalCredits(actor.id);
    return {
      referralCode: code,
      inviteLink,
      totalReferrals: referrals.length,
      totalCredits: Number(totalCredits),
      referrals: referrals.map((r) => ({
        id: r.id,
        referredUserId: r.referred.id,
        referredUserName: `${r.referred.firstName} ${r.referred.lastName}`.trim() || 'Пользователь',
        createdAt: r.createdAt.toISOString(),
        rewardPaid: r.rewardPaid,
      })),
    };
  }
}
