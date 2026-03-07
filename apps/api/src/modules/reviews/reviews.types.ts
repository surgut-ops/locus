export type CreateReviewDto = {
  listingId: string;
  rating: number;
  comment: string | null;
};

export type ListingReviewsQuery = {
  page?: string;
  limit?: string;
};

export class ReviewsError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ReviewsError';
    this.statusCode = statusCode;
  }
}
