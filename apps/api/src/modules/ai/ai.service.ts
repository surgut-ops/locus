import { ListingStatus, type ListingType, type PrismaClient } from '@prisma/client';

import type { AuthenticatedUser } from '../../utils/auth.js';
import { AIBehaviorService } from './ai.behavior.service.js';
import { AIEmbeddingService } from './ai.embedding.service.js';
import { AIRecommendationService } from './ai.recommendation.service.js';
import { AIRankingService } from './ai.ranking.service.js';
import { AIError, type AssistedSearchPayload, type SearchFilters, type TrackSearchPayload, type TrackViewPayload } from './ai.types.js';

type SearchListing = {
  id: string;
  title: string;
  description: string;
  city: string;
  district: string | null;
  country: string;
  type: ListingType;
  rating: number;
  reviewCount: number;
  pricePerNight: { toNumber(): number } | null;
  pricePerMonth: { toNumber(): number } | null;
  _count: { bookings: number };
};

export class AIService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly behavior: AIBehaviorService,
    private readonly recommendations: AIRecommendationService,
    private readonly ranking: AIRankingService,
    private readonly embeddings: AIEmbeddingService,
  ) {}

  public async trackListingView(actor: AuthenticatedUser, payload: unknown) {
    const body = parseTrackView(payload);
    await this.behavior.trackListingView(actor.id, body.listingId);
    return { success: true };
  }

  public async trackSearchEvent(actor: AuthenticatedUser, payload: unknown) {
    const body = parseTrackSearch(payload);
    await this.behavior.trackSearch(actor.id, body.query, body.filters);
    return { success: true };
  }

  public async getRecommendations(actor: AuthenticatedUser) {
    return this.recommendations.getRecommendations(actor.id);
  }

  public async getTrending() {
    return this.recommendations.getTrendingListings(20);
  }

  public async aiAssistedSearch(actor: AuthenticatedUser, payload: unknown) {
    const body = parseAssistedSearch(payload);

    await this.behavior.trackSearch(actor.id, body.prompt, undefined);

    let filters: SearchFilters | null = null;

    try {
      filters = await this.extractFiltersWithAI(body.prompt);
    } catch {
      filters = null;
    }

    const listings = await this.standardSearch(filters, body.prompt);
    const signals = {
      views: await this.behavior.getRecentViews(actor.id, 50),
      favorites: await this.behavior.getRecentFavorites(actor.id, 50),
      bookings: await this.behavior.getRecentBookings(actor.id, 50),
      searches: await this.behavior.getRecentSearches(actor.id, 30),
    };

    const ranked = this.ranking.rankListings(
      await Promise.all(
        listings.map(async (listing) => ({
          id: listing.id,
          title: listing.title,
          description: listing.description,
          city: listing.city,
          district: listing.district,
          country: listing.country,
          type: listing.type,
          rating: listing.rating,
          reviewCount: listing.reviewCount,
          pricePerNight: listing.pricePerNight ? listing.pricePerNight.toNumber() : null,
          pricePerMonth: listing.pricePerMonth ? listing.pricePerMonth.toNumber() : null,
          views: await this.behavior.getListingViewsCount(listing.id),
          bookingsCount: listing._count.bookings,
        })),
      ),
      signals,
    );

    return {
      filtersUsed: filters,
      items: ranked,
    };
  }

  public async prepareListingEmbedding(listingId: string) {
    if (!listingId.trim()) {
      throw new AIError('listingId is required', 400);
    }
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, title: true, description: true },
    });
    if (!listing) {
      throw new AIError('Listing not found', 404);
    }
    const vector = await this.embeddings.createListingEmbedding(
      listing.id,
      listing.title,
      listing.description,
    );
    return { listingId: listing.id, dimensions: vector.length };
  }

  private async extractFiltersWithAI(prompt: string): Promise<SearchFilters | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AIError('OPENAI_API_KEY is missing', 500);
    }

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
            content:
              'Extract real-estate search filters from user query. Return JSON with optional keys: city,district,country,listingType,minPrice,maxPrice,minRating,amenities.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new AIError('AI search parser failed', 502);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    try {
      const parsed = JSON.parse(content) as SearchFilters;
      return parsed;
    } catch {
      return null;
    }
  }

  private async standardSearch(filters: SearchFilters | null, fallbackPrompt: string): Promise<SearchListing[]> {
    const normalized = filters ?? this.heuristicFilters(fallbackPrompt);
    const amenities = normalized.amenities ?? [];

    return this.prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        city: normalized.city ? { contains: normalized.city, mode: 'insensitive' } : undefined,
        district: normalized.district
          ? { contains: normalized.district, mode: 'insensitive' }
          : undefined,
        country: normalized.country ? { contains: normalized.country, mode: 'insensitive' } : undefined,
        type: normalized.listingType,
        rating: normalized.minRating ? { gte: normalized.minRating } : undefined,
        pricePerNight:
          normalized.minPrice || normalized.maxPrice
            ? {
                gte: normalized.minPrice,
                lte: normalized.maxPrice,
              }
            : undefined,
        amenities:
          amenities.length > 0
            ? {
                some: {
                  amenity: {
                    name: {
                      in: amenities,
                    },
                  },
                },
              }
            : undefined,
      },
      take: 100,
      select: {
        id: true,
        title: true,
        description: true,
        city: true,
        district: true,
        country: true,
        type: true,
        rating: true,
        reviewCount: true,
        pricePerNight: true,
        pricePerMonth: true,
        _count: { select: { bookings: true } },
      },
    });
  }

  private heuristicFilters(prompt: string): SearchFilters {
    const text = prompt.toLowerCase();
    const maxPriceMatch = text.match(/under\s*\$?(\d+)/i) ?? text.match(/до\s*(\d+)/i);
    return {
      city: text.includes('dubai') ? 'Dubai' : undefined,
      amenities: text.includes('pool') || text.includes('басс') ? ['pool'] : [],
      maxPrice: maxPriceMatch ? Number.parseInt(maxPriceMatch[1], 10) : undefined,
      listingType: text.includes('apartment') || text.includes('квартир') ? 'APARTMENT' : undefined,
    };
  }
}

function parseTrackView(payload: unknown): TrackViewPayload {
  if (!isObject(payload)) {
    throw new AIError('Invalid payload', 400);
  }
  return {
    listingId: requireString(payload.listingId, 'listingId'),
  };
}

function parseTrackSearch(payload: unknown): TrackSearchPayload {
  if (!isObject(payload)) {
    throw new AIError('Invalid payload', 400);
  }
  return {
    query: requireString(payload.query, 'query'),
    filters: isObject(payload.filters) ? (payload.filters as SearchFilters) : undefined,
  };
}

function parseAssistedSearch(payload: unknown): AssistedSearchPayload {
  if (!isObject(payload)) {
    throw new AIError('Invalid payload', 400);
  }
  return {
    prompt: requireString(payload.prompt, 'prompt'),
  };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AIError(`Field "${field}" is required`, 400);
  }
  return value.trim();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
