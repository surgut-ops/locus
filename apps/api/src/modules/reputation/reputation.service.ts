import type { PrismaClient } from '@prisma/client';

import { LoggerService } from '../infrastructure/logging/logger.service.js';
import type { ReputationResponse } from './reputation.types.js';
import { ReputationError } from './reputation.types.js';
import { ReputationRepository } from './reputation.repository.js';

const MAX_RESPONSE_TIME_MINUTES = 1440;
const BADGE_TOP_HOST_THRESHOLD = 80;
const BADGE_RELIABLE_GUEST_THRESHOLD = 75;
const BADGE_SUPER_LISTING_THRESHOLD = 85;

export class ReputationService {
  private readonly logger = new LoggerService('reputation');

  public constructor(
    private readonly repository: ReputationRepository,
    private readonly prisma: PrismaClient,
  ) {}

  public async getUserReputation(userId: string): Promise<ReputationResponse> {
    const user = await this.repository.getUserForReputation(userId);
    if (!user) {
      throw new ReputationError('User not found', 404);
    }

    const [bookingStats, avgResponseMinutes, complaintCount, reviews] = await Promise.all([
      this.repository.getBookingStats(userId),
      this.repository.getAvgResponseTimeMinutes(userId),
      this.repository.getComplaintCountAgainstUser(userId),
      this.repository.getReviewsForUser(userId),
    ]);

    const totalCompleted =
      bookingStats.asGuest.completed + bookingStats.asHost.completed;
    const totalCancelled =
      bookingStats.asGuest.cancelled + bookingStats.asHost.cancelled;
    const totalBookings =
      bookingStats.asGuest.total + bookingStats.asHost.total;

    const completionRate =
      totalBookings > 0
        ? (totalCompleted / (totalCompleted + totalCancelled)) * 100
        : 100;

    const avgReviewRating =
      reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0;

    const breakdown = {
      bookingReliability: this.scoreBookingReliability(completionRate, totalBookings),
      responseSpeed: this.scoreResponseSpeed(avgResponseMinutes),
      reviewQuality: this.scoreReviewQuality(avgReviewRating, reviews.length),
      complaintRate: this.scoreComplaintRate(complaintCount, totalBookings, reviews.length),
      aiInsight: 0,
    };

    let aiInsightScore = 0;
    if (reviews.length > 0) {
      try {
        aiInsightScore = await this.analyzeWithAI(
          reviews.map((r) => ({ rating: r.rating, comment: r.comment })),
          { totalCompleted, totalCancelled, avgResponseMinutes, complaintCount },
        );
      } catch (err) {
        this.logger.warn('AI analysis failed', { userId, error: String(err) });
      }
    }
    breakdown.aiInsight = aiInsightScore;

    const reputationScore = Math.round(
      breakdown.bookingReliability * 0.3 +
        breakdown.responseSpeed * 0.2 +
        breakdown.reviewQuality * 0.25 +
        breakdown.complaintRate * 0.15 +
        breakdown.aiInsight * 0.1,
    );

    const badges = this.calculateBadges(
      reputationScore,
      user.role,
      bookingStats.asHost.total,
      completionRate,
      avgReviewRating,
    );

    const response: ReputationResponse = {
      userId: user.id,
      reputationScore: Math.min(100, Math.max(0, reputationScore)),
      breakdown,
      metrics: {
        completedBookings: totalCompleted,
        cancelledBookings: totalCancelled,
        totalBookings,
        completionRate: Math.round(completionRate * 100) / 100,
        avgResponseTimeMinutes: avgResponseMinutes
          ? Math.round(avgResponseMinutes * 10) / 10
          : null,
        complaintCount,
        avgReviewRating: Math.round(avgReviewRating * 100) / 100,
        reviewCount: reviews.length,
      },
      badges,
    };

    await this.repository.updateUserReputationScore(user.id, response.reputationScore);
    return response;
  }

  public async recalculateAndUpdate(userId: string): Promise<number> {
    const result = await this.getUserReputation(userId);
    return result.reputationScore;
  }

  public static async recalculateForUser(prisma: PrismaClient, userId: string): Promise<void> {
    const repo = new ReputationRepository(prisma);
    const service = new ReputationService(repo, prisma);
    try {
      await service.recalculateAndUpdate(userId);
    } catch (err) {
      console.error('[ReputationService] recalculateForUser failed:', err);
    }
  }

  private scoreBookingReliability(completionRate: number, totalBookings: number): number {
    if (totalBookings === 0) return 100;
    return Math.round(completionRate);
  }

  private scoreResponseSpeed(avgMinutes: number | null): number {
    if (avgMinutes === null) return 100;
    if (avgMinutes <= 60) return 100;
    if (avgMinutes >= MAX_RESPONSE_TIME_MINUTES) return 0;
    return Math.round(100 - (avgMinutes / MAX_RESPONSE_TIME_MINUTES) * 100);
  }

  private scoreReviewQuality(avgRating: number, count: number): number {
    if (count === 0) return 100;
    return Math.round((avgRating / 5) * 100);
  }

  private scoreComplaintRate(
    complaintCount: number,
    totalBookings: number,
    reviewCount: number,
  ): number {
    const interactions = totalBookings + reviewCount;
    if (interactions === 0) return complaintCount === 0 ? 100 : 50;
    const rate = complaintCount / Math.max(1, interactions);
    if (rate === 0) return 100;
    if (rate >= 0.2) return 0;
    return Math.round(100 - rate * 500);
  }

  private async analyzeWithAI(
    reviews: { rating: number; comment: string | null }[],
    metrics: {
      totalCompleted: number;
      totalCancelled: number;
      avgResponseMinutes: number | null;
      complaintCount: number;
    },
  ): Promise<number> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return 50;

    const samples = reviews
      .filter((r) => r.comment)
      .slice(0, 10)
      .map((r) => ({ rating: r.rating, comment: r.comment }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Analyze user behavior and reviews for a rental platform reputation score.
Metrics: completed bookings, cancelled bookings, avg response time (minutes), complaints.
Reviews sample: rating 1-5 and optional comment.
Return JSON: { "score": number } where score is 0-100. Higher = better reputation.`,
          },
          {
            role: 'user',
            content: JSON.stringify({
              metrics,
              reviewSamples: samples,
            }),
          },
        ],
      }),
    });

    if (!response.ok) return 50;

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return 50;

    try {
      const parsed = JSON.parse(content) as { score?: number };
      const score = typeof parsed.score === 'number' ? parsed.score : 50;
      return Math.min(100, Math.max(0, score));
    } catch {
      return 50;
    }
  }

  private calculateBadges(
    reputationScore: number,
    role: string,
    hostBookings: number,
    completionRate: number,
    avgReviewRating: number,
  ): string[] {
    const badges: string[] = [];

    if (role === 'HOST' && reputationScore >= BADGE_TOP_HOST_THRESHOLD && hostBookings >= 5) {
      badges.push('Top Host');
    }

    if (
      (role === 'USER' || role === 'GUEST') &&
      reputationScore >= BADGE_RELIABLE_GUEST_THRESHOLD &&
      completionRate >= 90
    ) {
      badges.push('Reliable Guest');
    }

    if (
      role === 'HOST' &&
      reputationScore >= BADGE_SUPER_LISTING_THRESHOLD &&
      avgReviewRating >= 4.5
    ) {
      badges.push('Super Listing');
    }

    return badges;
  }
}
