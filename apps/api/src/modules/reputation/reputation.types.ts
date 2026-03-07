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

export class ReputationError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ReputationError';
    this.statusCode = statusCode;
  }
}
