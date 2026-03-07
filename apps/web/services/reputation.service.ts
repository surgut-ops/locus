import { apiRequest } from '../lib/api';

export type ReputationResponse = {
  userId: string;
  reputationScore: number;
  breakdown: {
    bookingReliability: number;
    responseSpeed: number;
    reviewQuality: number;
    complaintRate: number;
    aiInsight: number;
  };
  metrics: {
    completedBookings: number;
    cancelledBookings: number;
    totalBookings: number;
    completionRate: number;
    avgResponseTimeMinutes: number | null;
    complaintCount: number;
    avgReviewRating: number;
    reviewCount: number;
  };
  badges: string[];
};

export async function getUserReputation(userId: string): Promise<ReputationResponse> {
  return apiRequest<ReputationResponse>(`/reputation/user/${userId}`, {
    cacheTtlMs: 60_000,
  });
}
