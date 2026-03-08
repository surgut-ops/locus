import type Redis from 'ioredis';

import { getSharedRedis } from '../../lib/redis.client.js';
import { ListingStatus, type ListingType, type PrismaClient } from '@prisma/client';

import { AIBehaviorService } from './ai.behavior.service.js';
import { AIRankingService } from './ai.ranking.service.js';
import type { RankedListing, RankingInputListing, UserBehaviorSignals } from './ai.types.js';

type ListingWithCount = {
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

export class AIRecommendationService {
  private readonly redis: Redis | null;

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly behavior: AIBehaviorService,
    private readonly ranking: AIRankingService,
  ) {
    this.redis = getSharedRedis();
  }

  public async getRecommendations(userId: string): Promise<RankedListing[]> {
    const cacheKey = `ai:recommendations:${userId}`;
    const cached = await this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const signals = await this.getUserSignals(userId);
    const candidates = await this.buildCandidates(signals);
    const ranked = this.ranking.rankListings(candidates, signals);
    const top = ranked.slice(0, 20);

    await this.setCache(cacheKey, top, 300);
    return top;
  }

  public async getTrendingListings(limit = 20): Promise<RankedListing[]> {
    const listings = await this.prisma.listing.findMany({
      where: { status: ListingStatus.PUBLISHED },
      orderBy: [{ reviewCount: 'desc' }, { rating: 'desc' }, { updatedAt: 'desc' }],
      take: Math.max(limit, 50),
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

    const mapped = await this.toRankingListings(listings);
    const ranked = this.ranking.rankListings(mapped, {
      views: [],
      favorites: [],
      bookings: [],
      searches: [],
    });

    return ranked.slice(0, limit);
  }

  private async buildCandidates(signals: UserBehaviorSignals): Promise<RankingInputListing[]> {
    const viewedIds = unique(signals.views);
    let preferredCities: string[] = [];
    let preferredTypes: ListingType[] = [];

    if (viewedIds.length > 0) {
      const viewedListings = await this.prisma.listing.findMany({
        where: { id: { in: viewedIds } },
        select: { city: true, type: true },
      });
      preferredCities = unique(viewedListings.map((item) => item.city));
      preferredTypes = unique(viewedListings.map((item) => item.type));
    }

    const similarListings = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        OR: [
          preferredCities.length > 0 ? { city: { in: preferredCities } } : undefined,
          preferredTypes.length > 0 ? { type: { in: preferredTypes } } : undefined,
        ].filter(Boolean) as object[],
      },
      take: 80,
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

    const cityListings =
      preferredCities.length > 0
        ? await this.prisma.listing.findMany({
            where: {
              status: ListingStatus.PUBLISHED,
              city: { in: preferredCities },
            },
            take: 50,
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
          })
        : [];

    const highRatedListings = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: 50,
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

    const trending = await this.getTrendingListings(50);
    const merged = mergeUniqueById(
      await this.toRankingListings([...similarListings, ...cityListings, ...highRatedListings]),
      trending,
    );

    return merged;
  }

  private async getUserSignals(userId: string): Promise<UserBehaviorSignals> {
    const [views, favoritesTracked, searches, bookingsTracked, favoritesDb, bookingsDb] = await Promise.all([
      this.behavior.getRecentViews(userId, 50),
      this.behavior.getRecentFavorites(userId, 50),
      this.behavior.getRecentSearches(userId, 30),
      this.behavior.getRecentBookings(userId, 50),
      this.prisma.favorite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { listingId: true },
      }),
      this.prisma.booking.findMany({
        where: { guestId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { listingId: true },
      }),
    ]);

    return {
      views: unique(views),
      favorites: unique([...favoritesTracked, ...favoritesDb.map((item) => item.listingId)]),
      searches: unique(searches),
      bookings: unique([...bookingsTracked, ...bookingsDb.map((item) => item.listingId)]),
    };
  }

  private async toRankingListings(listings: ListingWithCount[]): Promise<RankingInputListing[]> {
    return Promise.all(
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
    );
  }

  private async getCache(key: string): Promise<RankedListing[] | null> {
    if (!this.redis) {
      return null;
    }
    const raw = await this.redis.get(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as RankedListing[];
    } catch {
      return null;
    }
  }

  private async setCache(key: string, value: RankedListing[], ttlSeconds: number): Promise<void> {
    if (!this.redis) {
      return;
    }
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function mergeUniqueById(a: RankingInputListing[], b: RankingInputListing[]): RankingInputListing[] {
  const map = new Map<string, RankingInputListing>();
  for (const item of [...a, ...b]) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}
