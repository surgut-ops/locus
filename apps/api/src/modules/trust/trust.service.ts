import type { PrismaClient } from '@prisma/client';

import { LoggerService } from '../infrastructure/logging/logger.service.js';
import type { ListingTrustResponse, UserTrustResponse } from './trust.types.js';
import { TrustError } from './trust.types.js';
import { TrustRepository } from './trust.repository.js';

const USER_TRUST_WEIGHTS = {
  emailVerified: 10,
  phoneVerified: 15,
  identityVerified: 25,
  goodReviews: 20,
} as const;

const GOOD_REVIEW_THRESHOLD = 4;
const LISTING_OWNER_WEIGHT = 50;
const LISTING_REVIEWS_WEIGHT = 30;
const LISTING_VERIFIED_PHOTOS_WEIGHT = 20;

export class TrustService {
  private readonly logger = new LoggerService('trust');

  public constructor(
    private readonly repository: TrustRepository,
    private readonly prisma: PrismaClient,
  ) {}

  public async getUserTrust(userId: string): Promise<UserTrustResponse> {
    const user = await this.repository.getUserForTrust(userId);
    if (!user) {
      throw new TrustError('User not found', 404);
    }

    const breakdown = this.calculateUserTrustBreakdown(user);
    const trustScore = Object.values(breakdown).reduce((a, b) => a + b, 0);

    const response: UserTrustResponse = {
      userId: user.id,
      trustScore: Math.min(100, trustScore),
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      identityVerified: user.identityVerified,
      breakdown,
    };

    await this.updateUserTrustScoreIfChanged(user.id, trustScore);
    return response;
  }

  public async getListingTrust(listingId: string): Promise<ListingTrustResponse> {
    const listing = await this.repository.getListingForTrust(listingId);
    if (!listing) {
      throw new TrustError('Listing not found', 404);
    }

    const ownerTrustScore = Math.min(100, listing.owner.trustScore);
    const reviewsScore = this.calculateListingReviewsScore(listing.reviews);
    const verifiedPhotosScore = this.calculateVerifiedPhotosScore(listing.images);

    const trustScore = Math.round(
      (ownerTrustScore * LISTING_OWNER_WEIGHT) / 100 +
        (reviewsScore * LISTING_REVIEWS_WEIGHT) / 100 +
        (verifiedPhotosScore * LISTING_VERIFIED_PHOTOS_WEIGHT) / 100,
    );

    const response: ListingTrustResponse = {
      listingId: listing.id,
      trustScore: Math.min(100, trustScore),
      ownerTrustScore,
      reviewsScore,
      verifiedPhotosScore,
    };

    await this.updateListingTrustScoreIfChanged(listing.id, trustScore);
    return response;
  }

  public calculateUserTrustScore(user: {
    emailVerified: boolean;
    phoneVerified: boolean;
    identityVerified: boolean;
    rating: number;
    reviewCount: number;
  }): number {
    const breakdown = this.calculateUserTrustBreakdown(user);
    return Math.min(100, Object.values(breakdown).reduce((a, b) => a + b, 0));
  }

  private calculateUserTrustBreakdown(user: {
    emailVerified: boolean;
    phoneVerified: boolean;
    identityVerified: boolean;
    rating: number;
    reviewCount: number;
  }) {
    const emailVerified = user.emailVerified ? USER_TRUST_WEIGHTS.emailVerified : 0;
    const phoneVerified = user.phoneVerified ? USER_TRUST_WEIGHTS.phoneVerified : 0;
    const identityVerified = user.identityVerified ? USER_TRUST_WEIGHTS.identityVerified : 0;
    const goodReviews =
      user.reviewCount > 0 && user.rating >= GOOD_REVIEW_THRESHOLD ? USER_TRUST_WEIGHTS.goodReviews : 0;

    return {
      emailVerified,
      phoneVerified,
      identityVerified,
      goodReviews,
    };
  }

  private calculateListingReviewsScore(reviews: { rating: number }[]): number {
    if (reviews.length === 0) return 0;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return avgRating >= GOOD_REVIEW_THRESHOLD ? 100 : Math.round((avgRating / 5) * 100);
  }

  private calculateVerifiedPhotosScore(images: { verified: boolean }[]): number {
    if (images.length === 0) return 0;
    const verifiedCount = images.filter((img) => img.verified).length;
    return Math.min(verifiedCount * 25, 100);
  }

  private async updateUserTrustScoreIfChanged(userId: string, newScore: number): Promise<void> {
    const capped = Math.min(100, newScore);
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { trustScore: true },
    });
    if (current && current.trustScore !== capped) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { trustScore: capped },
      });
    }
  }

  private async updateListingTrustScoreIfChanged(listingId: string, newScore: number): Promise<void> {
    const capped = Math.min(100, newScore);
    const current = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { trustScore: true },
    });
    if (current && current.trustScore !== capped) {
      await this.prisma.listing.update({
        where: { id: listingId },
        data: { trustScore: capped },
      });
    }
  }
}
