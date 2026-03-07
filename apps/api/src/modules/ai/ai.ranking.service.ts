import type { RankedListing, RankingInputListing, UserBehaviorSignals } from './ai.types.js';

export class AIRankingService {
  public rankListings(listings: RankingInputListing[], signals: UserBehaviorSignals): RankedListing[] {
    if (listings.length === 0) {
      return [];
    }

    const maxViews = Math.max(...listings.map((item) => item.views), 1);
    const maxBookings = Math.max(...listings.map((item) => item.bookingsCount), 1);
    const maxReviews = Math.max(...listings.map((item) => item.reviewCount), 1);

    const viewedSet = new Set(signals.views);
    const favoriteSet = new Set(signals.favorites);

    const ranked = listings.map((listing) => {
      const relevance = this.calculateRelevance(listing, signals.searches);
      const rating = clamp(listing.rating / 5, 0, 1);
      const popularity =
        0.5 * clamp(listing.views / maxViews, 0, 1) +
        0.3 * clamp(listing.bookingsCount / maxBookings, 0, 1) +
        0.2 * clamp(listing.reviewCount / maxReviews, 0, 1);

      const personalization = this.calculatePersonalization(listing, viewedSet, favoriteSet, signals);

      const score =
        0.4 * relevance +
        0.2 * rating +
        0.2 * popularity +
        0.2 * personalization;

      return {
        ...listing,
        score: Number(score.toFixed(4)),
      };
    });

    return ranked.sort((a, b) => b.score - a.score);
  }

  private calculateRelevance(listing: RankingInputListing, searches: string[]): number {
    if (searches.length === 0) {
      return 0.5;
    }
    const searchable = `${listing.title} ${listing.description} ${listing.city} ${listing.district ?? ''}`.toLowerCase();
    let hits = 0;
    for (const search of searches.slice(0, 10)) {
      const token = search.toLowerCase().trim();
      if (token && searchable.includes(token)) {
        hits += 1;
      }
    }
    return clamp(hits / Math.max(1, Math.min(searches.length, 10)), 0, 1);
  }

  private calculatePersonalization(
    listing: RankingInputListing,
    viewedSet: Set<string>,
    favoriteSet: Set<string>,
    signals: UserBehaviorSignals,
  ): number {
    let score = 0;
    if (viewedSet.has(listing.id)) {
      score += 0.2;
    }
    if (favoriteSet.has(listing.id)) {
      score += 0.4;
    }

    const citySignal = signals.searches.some((query) =>
      query.toLowerCase().includes(listing.city.toLowerCase()),
    );
    if (citySignal) {
      score += 0.2;
    }

    const typeSignal = signals.searches.some((query) =>
      query.toLowerCase().includes(listing.type.toLowerCase()),
    );
    if (typeSignal) {
      score += 0.2;
    }

    return clamp(score, 0, 1);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
