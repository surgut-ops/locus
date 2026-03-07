import { apiRequest } from '../lib/api';

export type UserTrustResponse = {
  userId: string;
  trustScore: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;
  breakdown: {
    emailVerified: number;
    phoneVerified: number;
    identityVerified: number;
    goodReviews: number;
  };
};

export async function getUserTrust(userId: string): Promise<UserTrustResponse> {
  return apiRequest<UserTrustResponse>(`/trust/user/${userId}`, { cacheTtlMs: 60_000 });
}
