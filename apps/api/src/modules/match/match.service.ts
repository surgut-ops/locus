import { CACHE_TTL, CacheService } from '../infrastructure/cache/cache.service.js';
import { MatchRepository } from './match.repository.js';
import type {
  MatchListingItem,
  MatchRecommendationItem,
  MatchRecommendationsResponse,
  MatchUserPreferences,
} from './match.types.js';

const MATCH_LIMIT = 12;
const AI_BATCH_SIZE = 5;

export class MatchService {
  public constructor(
    private readonly repository: MatchRepository,
    private readonly cache: CacheService,
  ) {}

  public async getRecommendations(
    userId: string,
    limit = MATCH_LIMIT,
  ): Promise<MatchRecommendationsResponse> {
    const cacheKey = this.cache.keys.matchRecommendations(userId, limit);
    const cached = await this.cache.get<MatchRecommendationsResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const activities = await this.repository.getActivitiesWithMetadata(userId, 150);
    const excludeIds = Array.from(
      new Set(
        activities
          .map((a) => a.listingId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const preferences = this.repository.buildPreferencesFromActivities(activities);
    await this.repository.upsertUserPreference(userId, preferences);

    const hasPreferences =
      preferences.favoriteCities.length > 0 ||
      preferences.amenities.length > 0 ||
      preferences.propertyTypes.length > 0 ||
      preferences.priceMin !== undefined ||
      preferences.priceMax !== undefined;

    let candidates: MatchListingItem[];
    if (hasPreferences) {
      candidates = await this.repository.findMatchCandidates(
        preferences,
        excludeIds,
        limit + 5,
      );
    } else {
      candidates = await this.repository.getFallbackListings(limit + 5, excludeIds);
    }

    const items = await this.enrichWithAI(candidates.slice(0, limit), preferences);
    const response: MatchRecommendationsResponse = { listings: items };
    await this.cache.set(cacheKey, response, CACHE_TTL.MATCH_RECOMMENDATIONS);
    return response;
  }

  private async enrichWithAI(
    listings: MatchListingItem[],
    preferences: MatchUserPreferences,
  ): Promise<MatchRecommendationItem[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || listings.length === 0) {
      return listings.map((l) => ({
        listing: l,
        matchScore: 75,
        aiInsight: 'Рекомендовано для вас.',
      }));
    }

    const results: MatchRecommendationItem[] = [];
    for (let i = 0; i < listings.length; i += AI_BATCH_SIZE) {
      const batch = listings.slice(i, i + AI_BATCH_SIZE);
      const batchResults = await this.scoreBatchWithAI(batch, preferences);
      results.push(...batchResults);
    }
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  private async scoreBatchWithAI(
    listings: MatchListingItem[],
    preferences: MatchUserPreferences,
  ): Promise<MatchRecommendationItem[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return listings.map((l) => ({
        listing: l,
        matchScore: 75,
        aiInsight: 'Рекомендовано для вас.',
      }));
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          max_tokens: 600,
          messages: [
            {
              role: 'system',
              content: `You are a real estate matching assistant. Given user preferences and listings, return a JSON array. Each element: { "listingId": "uuid", "matchScore": number 0-100, "aiInsight": "1 short sentence why it matches" }.
Match score: 90+ if city, type, price and amenities align well; 70-89 if partial match; 50-69 if weak match. aiInsight in the same language as listing location. Return ONLY valid JSON array.`,
            },
            {
              role: 'user',
              content: JSON.stringify({
                preferences: {
                  favoriteCities: preferences.favoriteCities,
                  priceRange: { min: preferences.priceMin, max: preferences.priceMax },
                  propertyTypes: preferences.propertyTypes,
                  amenities: preferences.amenities,
                },
                listings: listings.map((l) => ({
                  id: l.id,
                  title: l.title,
                  city: l.city,
                  type: l.type,
                  pricePerNight: l.pricePerNight,
                  amenities: l.amenities.map((a) => a.name),
                })),
              }),
            },
          ],
        }),
      });

      if (!response.ok) {
        return this.fallbackScore(listings);
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) return this.fallbackScore(listings);

      const parsed = JSON.parse(
        content.replace(/^```json?\s*|\s*```$/g, ''),
      ) as Array<{ listingId: string; matchScore: number; aiInsight: string }>;

      const byId = new Map(parsed.map((p) => [p.listingId, p]));
      return listings.map((listing) => {
        const p = byId.get(listing.id);
        const score = Math.min(100, Math.max(0, p?.matchScore ?? 75));
        const insight =
          (p?.aiInsight && p.aiInsight.length < 200 ? p.aiInsight : null) ??
          'Рекомендовано для вас.';
        return {
          listing,
          matchScore: score,
          aiInsight: insight,
        };
      });
    } catch {
      return this.fallbackScore(listings);
    }
  }

  private fallbackScore(listings: MatchListingItem[]): MatchRecommendationItem[] {
    return listings.map((l) => ({
      listing: l,
      matchScore: 75,
      aiInsight: 'Рекомендовано для вас.',
    }));
  }
}
