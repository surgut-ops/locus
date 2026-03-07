export type ReferralMeResponse = {
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

export class ReferralError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ReferralError';
    this.statusCode = statusCode;
  }
}
