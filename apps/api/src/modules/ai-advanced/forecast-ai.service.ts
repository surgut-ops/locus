import { BookingStatus, type PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';

import { getSharedRedis } from '../../lib/redis.client.js';
import { AIBehaviorService } from '../ai/ai.behavior.service.js';
import { AIAdvancedError, type DemandForecastResult } from './ai-advanced.types.js';

export class ForecastAIService {
  private readonly redis: Redis | null;

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly behavior: AIBehaviorService,
  ) {
    this.redis = getSharedRedis();
  }

  public async predictDemand(listingId: string): Promise<DemandForecastResult> {
    if (!listingId.trim()) {
      throw new AIAdvancedError('listingId is required', 400);
    }

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, city: true, district: true },
    });
    if (!listing) {
      throw new AIAdvancedError('Listing not found', 404);
    }

    const [listingBookings, cityBookings, views, searchSignal] = await Promise.all([
      this.getMonthlyBookingCounts({ listingId }),
      this.getMonthlyBookingCounts({ city: listing.city }),
      this.behavior.getListingViewsCount(listing.id),
      this.getSearchDemandSignal(listing.city, listing.district),
    ]);

    const avgListingBookings = average(listingBookings);
    const avgCityBookings = average(cityBookings);

    const expectedBookings = Math.max(
      0,
      Math.round(avgListingBookings * 1.1 + avgCityBookings * 0.05 + views * 0.01 + searchSignal * 0.15),
    );

    const peakSeasons = toSeasonLabels(topMonths(cityBookings, 3));
    const lowDemandPeriods = toSeasonLabels(bottomMonths(cityBookings, 3));
    const demandScore = round2(
      clamp(avgListingBookings * 8 + avgCityBookings * 0.8 + views * 0.12 + searchSignal * 2, 1, 100),
    );

    return {
      expectedBookings,
      peakSeasons,
      lowDemandPeriods,
      demandScore,
    };
  }

  private async getMonthlyBookingCounts(filter: { listingId?: string; city?: string }): Promise<number[]> {
    const from = startOfMonthMonthsAgo(11);
    const bookings = await this.prisma.booking.findMany({
      where: {
        listingId: filter.listingId,
        listing: filter.city ? { city: filter.city } : undefined,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        createdAt: { gte: from },
      },
      select: { createdAt: true },
    });

    const counts = new Array<number>(12).fill(0);
    for (const booking of bookings) {
      const monthIndex = monthDistance(from, booking.createdAt);
      if (monthIndex >= 0 && monthIndex < 12) {
        counts[monthIndex] += 1;
      }
    }
    return counts;
  }

  private async getSearchDemandSignal(city: string, district: string | null): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    let cursor = '0';
    let matches = 0;
    let scanned = 0;

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', 'user:*:searches', 'COUNT', 50);
      cursor = nextCursor;
      for (const key of keys) {
        const rows = await this.redis.lrange(key, 0, 20);
        scanned += rows.length;
        for (const row of rows) {
          const query = safeExtractQuery(row).toLowerCase();
          if (!query) {
            continue;
          }
          const cityHit = query.includes(city.toLowerCase());
          const districtHit = district ? query.includes(district.toLowerCase()) : false;
          if (cityHit || districtHit) {
            matches += 1;
          }
        }
      }
      if (scanned > 800) {
        break;
      }
    } while (cursor !== '0');

    return matches;
  }
}

function startOfMonthMonthsAgo(monthsAgo: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1, 0, 0, 0));
}

function monthDistance(base: Date, date: Date): number {
  return (date.getUTCFullYear() - base.getUTCFullYear()) * 12 + (date.getUTCMonth() - base.getUTCMonth());
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function topMonths(values: number[], count: number): number[] {
  return values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value)
    .slice(0, count)
    .map((item) => item.index);
}

function bottomMonths(values: number[], count: number): number[] {
  return values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value)
    .slice(0, count)
    .map((item) => item.index);
}

function toSeasonLabels(monthIndices: number[]): string[] {
  return monthIndices.map((monthIndex) => {
    const month = monthIndex + 1;
    if ([12, 1, 2].includes(month)) {
      return 'WINTER';
    }
    if ([3, 4, 5].includes(month)) {
      return 'SPRING';
    }
    if ([6, 7, 8].includes(month)) {
      return 'SUMMER';
    }
    return 'AUTUMN';
  });
}

function safeExtractQuery(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { query?: unknown };
    return typeof parsed.query === 'string' ? parsed.query : '';
  } catch {
    return '';
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
