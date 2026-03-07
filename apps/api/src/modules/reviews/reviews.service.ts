import type { PrismaClient } from '@prisma/client';

import type { AuthenticatedUser } from '../../utils/auth.js';
import { ReputationService } from '../reputation/reputation.service.js';
import { ReviewsRepository } from './reviews.repository.js';
import { type CreateReviewDto, type ListingReviewsQuery, ReviewsError } from './reviews.types.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export class ReviewsService {
  public constructor(
    private readonly repository: ReviewsRepository,
    private readonly prisma?: PrismaClient,
  ) {}

  public async createReview(actor: AuthenticatedUser, payload: unknown) {
    const dto = parseCreateReview(payload);

    const listingExists = await this.repository.listingExists(dto.listingId);
    if (!listingExists) {
      throw new ReviewsError('Listing not found', 404);
    }

    const completedBookings = await this.repository.countCompletedBookingsForListing(actor.id, dto.listingId);
    if (completedBookings === 0) {
      throw new ReviewsError('Review allowed only after completed booking', 403);
    }

    const existingReviews = await this.repository.countAuthorReviewsForListing(actor.id, dto.listingId);
    if (existingReviews >= completedBookings) {
      throw new ReviewsError('Only one review is allowed per completed booking', 409);
    }

    const result = await this.repository.createReviewAndRecalculateRating({
      listingId: dto.listingId,
      authorId: actor.id,
      rating: dto.rating,
      comment: dto.comment,
    });

    if (this.prisma) {
      const ownerId = await this.repository.getListingOwnerId(dto.listingId);
      ReputationService.recalculateForUser(this.prisma, actor.id).catch(() => {});
      if (ownerId && ownerId !== actor.id) {
        ReputationService.recalculateForUser(this.prisma, ownerId).catch(() => {});
      }
    }

    return result;
  }

  public async getListingReviews(listingId: string, query: ListingReviewsQuery) {
    assertId(listingId, 'Listing id is required');
    const page = parsePositiveInt(query.page, DEFAULT_PAGE);
    const limit = Math.min(parsePositiveInt(query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.repository.getListingReviews(listingId, skip, limit),
      this.repository.countListingReviews(listingId),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}

function parseCreateReview(payload: unknown): CreateReviewDto {
  if (!isObject(payload)) {
    throw new ReviewsError('Invalid review payload', 400);
  }

  const listingId = requireString(payload.listingId, 'listingId');
  const rating = parseRating(payload.rating);
  const comment = optionalComment(payload.comment);

  return {
    listingId,
    rating,
    comment,
  };
}

function parseRating(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ReviewsError('Field "rating" must be an integer', 400);
  }
  if (value < 1 || value > 5) {
    throw new ReviewsError('Field "rating" must be between 1 and 5', 400);
  }
  return value;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ReviewsError(`Field "${field}" is required`, 400);
  }
  return value.trim();
}

function optionalComment(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    throw new ReviewsError('Field "comment" must be a string', 400);
  }
  return value.trim() || null;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ReviewsError('Pagination params must be positive integers', 400);
  }
  return parsed;
}

function assertId(value: string, message: string): void {
  if (!value || !value.trim()) {
    throw new ReviewsError(message, 400);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
