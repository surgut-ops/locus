import { apiRequest } from '../lib/api';

export type ReferralMe = {
  referralCode: string;
  inviteLink: string;
  totalReferrals: number;
  totalCredits: number;
  referrals: {
    id: string;
    referredUserId: string;
    referredUserName: string;
    createdAt: string;
    rewardPaid: boolean;
  }[];
};

export async function fetchReferralMe(): Promise<ReferralMe> {
  return apiRequest<ReferralMe>('/referral/me', { cacheTtlMs: 0 });
}
