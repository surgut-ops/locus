import { UserActivityAction } from '@prisma/client';

import { CACHE_TTL, CacheService } from '../infrastructure/cache/cache.service.js';
import { RecommendationsRepository } from './recommendations.repository.js';
import type { RecommendationListing } from './recommendations.types.js';

const RECOMMENDATIONS_LIMIT = 20;

export class RecommendationsService {
  public constructor(
    private readonly repository: RecommendationsRepository,
    private readonly cache: CacheService,
  ) {}

  public async getRecommendations(userId?: string, limit = RECOMMENDATIONS_LIMIT): Promise<RecommendationListing[]> {
    if (!userId) {
      return this.getFallbackRecommendations(limit);
    }

    const cacheKey = this.cache.keys.aiRecommendations(userId, limit);
    const cached = await this.cache.get<RecommendationListing[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const activities = await this.repository.getUserActivities(userId, 120);
    const hasRichSignals = activities.some((activity) => activity.listingId !== null);

    if (!hasRichSignals) {
      const fallback = await this.getFallbackRecommendations(limit);
      await this.cache.set(cacheKey, fallback, CACHE_TTL.RECOMMENDATIONS);
      return fallback;
    }

    const preferences = this.repository.buildPreferencesFromActivities(activities);
    const excludedListingIds = unique(
      activities.map((activity) => activity.listingId).filter((listingId): listingId is string => Boolean(listingId)),
    );

    const searchBoost = this.repository.countActionsByType(activities, UserActivityAction.SEARCH);
    const personalizedTake = Math.min(limit + Math.floor(searchBoost / 3), 30);
    const personalized = await this.repository.findPersonalizedListings(
      preferences,
      excludedListingIds,
      personalizedTake,
    );

    if (personalized.length >= limit) {
      const top = personalized.slice(0, limit);
      await this.cache.set(cacheKey, top, CACHE_TTL.RECOMMENDATIONS);
      return top;
    }

    const fallback = await this.getFallbackRecommendations(
      limit - personalized.length,
      unique([...excludedListingIds, ...personalized.map((item) => item.id)]),
    );
    const merged = [...personalized, ...fallback].slice(0, limit);
    await this.cache.set(cacheKey, merged, CACHE_TTL.RECOMMENDATIONS);
    return merged;
  }

  public async trackListingView(userId: string, listingId: string): Promise<void> {
    await this.trackActivity({ userId, listingId, action: UserActivityAction.VIEW });
  }

  public async trackSearch(userId: string, queryFilters?: Record<string, unknown>): Promise<void> {
    await this.trackActivity({
      userId,
      action: UserActivityAction.SEARCH,
      metadata: queryFilters ? { query: queryFilters } : undefined,
    });
  }

  public async trackBooking(userId: string, listingId: string): Promise<void> {
    await this.trackActivity({ userId, listingId, action: UserActivityAction.BOOK });
  }

  private async trackActivity(input: {
    userId: string;
    listingId?: string;
    action: UserActivityAction;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.repository.createUserActivity(input);
    await this.cache.invalidateRecommendations(input.userId);
  }

  private async getFallbackRecommendations(
    limit = RECOMMENDATIONS_LIMIT,
    excludedIds: string[] = [],
  ): Promise<RecommendationListing[]> {
    const [trending, topRated] = await Promise.all([
      this.repository.getTrendingListings(limit * 2),
      this.repository.getTopRatedListings(limit * 2),
    ]);

    const merged: RecommendationListing[] = [];
    const used = new Set(excludedIds);
    for (const listing of [...trending, ...topRated]) {
      if (used.has(listing.id)) {
        continue;
      }
      used.add(listing.id);
      merged.push(listing);
      if (merged.length >= limit) {
        break;
      }
    }
    return merged;
  }
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
