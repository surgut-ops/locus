import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../../utils/auth.js';
import { PricingRepository } from './pricing.repository.js';
import type { PricingSuggestResponse } from './pricing.types.js';
import { PricingError } from './pricing.types.js';

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const fn = (value as { toNumber: () => number }).toNumber;
    return typeof fn === 'function' ? fn.call(value) : null;
  }
  return null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export class PricingService {
  public constructor(private readonly repository: PricingRepository) {}

  public async suggestPrice(
    actor: AuthenticatedUser,
    listingId: string,
  ): Promise<PricingSuggestResponse> {
    if (!listingId?.trim()) {
      throw new PricingError('listingId is required', 400);
    }

    const listing = await this.repository.getListingForPricing(listingId);
    if (!listing) {
      throw new PricingError('Listing not found', 404);
    }

    const canAccess =
      actor.id === listing.ownerId ||
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.MODERATOR;
    if (!canAccess) {
      throw new PricingError('Only listing owner can get price suggestion', 403);
    }

    const currentPrice = toNumber(listing.pricePerNight);

    const similar = await this.repository.getSimilarListings({
      city: listing.city,
      type: listing.type,
      rooms: listing.rooms,
      maxGuests: listing.maxGuests,
      excludeId: listing.id,
    });

    const prices: number[] = [];
    for (const row of similar) {
      const price = toNumber(row.pricePerNight);
      if (price === null || price <= 0) continue;
      prices.push(price);
    }

    const averageMarketPrice =
      prices.length > 0
        ? round2(prices.reduce((a, b) => a + b, 0) / prices.length)
        : currentPrice ?? 50;

    const bookingsCount = await this.repository.getListingBookingsCount(
      listing.id,
    );

    const ratingFactor = 1 + clamp((listing.rating - 4) * 0.05, -0.1, 0.15);
    const popularityFactor = 1 + clamp(bookingsCount * 0.02, 0, 0.2);
    const reviewFactor =
      listing.reviewCount > 0 ? 1 + clamp(listing.reviewCount * 0.01, 0, 0.1) : 1;

    const baseRecommended = round2(
      averageMarketPrice * ratingFactor * popularityFactor * reviewFactor,
    );

    let recommendedPrice = baseRecommended;
    try {
      recommendedPrice = await this.getAICorrection({
        title: listing.title,
        description: listing.description,
        city: listing.city,
        type: listing.type,
        rooms: listing.rooms,
        guests: listing.maxGuests,
        rating: listing.rating,
        reviewCount: listing.reviewCount,
        amenitiesCount: listing.amenities.length,
        currentPrice,
        averageMarketPrice,
        baseRecommended,
      });
    } catch {
      recommendedPrice = baseRecommended;
    }

    return {
      currentPrice,
      averageMarketPrice,
      recommendedPrice: round2(recommendedPrice),
    };
  }

  private async getAICorrection(params: {
    title: string;
    description: string;
    city: string;
    type: string;
    rooms: number | null;
    guests: number | null;
    rating: number;
    reviewCount: number;
    amenitiesCount: number;
    currentPrice: number | null;
    averageMarketPrice: number;
    baseRecommended: number;
  }): Promise<number> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return params.baseRecommended;
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
            content: `You are a real estate pricing expert. Given listing data and market analysis, suggest the optimal nightly price in USD.
Return JSON: { "recommendedPrice": number }
Consider: listing quality, location, amenities, rating, reviews, market average.`,
          },
          {
            role: 'user',
            content: JSON.stringify({
              listing: {
                title: params.title,
                description: params.description?.slice(0, 300),
                city: params.city,
                type: params.type,
                rooms: params.rooms,
                guests: params.guests,
                rating: params.rating,
                reviewCount: params.reviewCount,
                amenitiesCount: params.amenitiesCount,
              },
              market: {
                currentPrice: params.currentPrice,
                averageMarketPrice: params.averageMarketPrice,
                baseRecommended: params.baseRecommended,
              },
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return params.baseRecommended;
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return params.baseRecommended;
    }

    try {
      const parsed = JSON.parse(content) as { recommendedPrice?: number };
      if (
        typeof parsed.recommendedPrice === 'number' &&
        parsed.recommendedPrice > 0
      ) {
        return parsed.recommendedPrice;
      }
    } catch {
      // ignore
    }
    return params.baseRecommended;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
