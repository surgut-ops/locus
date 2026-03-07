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

export type ListingTrustResponse = {
  listingId: string;
  trustScore: number;
  ownerTrustScore: number;
  reviewsScore: number;
  verifiedPhotosScore: number;
};

export class TrustError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'TrustError';
    this.statusCode = statusCode;
  }
}
