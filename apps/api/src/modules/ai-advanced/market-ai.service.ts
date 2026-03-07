import { BookingStatus, ListingStatus, type PrismaClient } from '@prisma/client';

import { AIBehaviorService } from '../ai/ai.behavior.service.js';
import { AIAdvancedError, type MarketHeatmapDistrict, type MarketStatsResult } from './ai-advanced.types.js';

export class MarketAIService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly behavior: AIBehaviorService,
  ) {}

  public async getCityMarketStats(city: string): Promise<MarketStatsResult> {
    if (!city.trim()) {
      throw new AIAdvancedError('city is required', 400);
    }
    return this.buildMarketStats({ city });
  }

  public async getDistrictStats(city: string, district: string): Promise<MarketStatsResult> {
    if (!city.trim() || !district.trim()) {
      throw new AIAdvancedError('city and district are required', 400);
    }
    return this.buildMarketStats({ city, district });
  }

  public async getMarketHeatmap(city?: string): Promise<MarketHeatmapDistrict[]> {
    const listings = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        city: city && city.trim() ? city.trim() : undefined,
      },
      select: {
        id: true,
        district: true,
        city: true,
      },
    });

    const districtMap = new Map<string, { bookings: number; views: number; listings: number }>();

    for (const listing of listings) {
      const key = listing.district ?? `${listing.city} (general)`;
      const entry = districtMap.get(key) ?? { bookings: 0, views: 0, listings: 0 };
      entry.listings += 1;
      districtMap.set(key, entry);
    }

    const counts = await this.prisma.booking.groupBy({
      by: ['listingId'],
      where: {
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        createdAt: { gte: daysAgo(90) },
      },
      _count: { _all: true },
    });
    const bookingByListing = new Map(counts.map((row) => [row.listingId, row._count._all]));

    for (const listing of listings) {
      const key = listing.district ?? `${listing.city} (general)`;
      const entry = districtMap.get(key);
      if (!entry) {
        continue;
      }
      entry.bookings += bookingByListing.get(listing.id) ?? 0;
      entry.views += await this.behavior.getListingViewsCount(listing.id);
    }

    return Array.from(districtMap.entries())
      .map(([district, value]) => ({
        district,
        demandIntensity: round2(
          clamp((value.bookings / Math.max(1, value.listings)) * 18 + (value.views / Math.max(1, value.listings)) * 0.6, 0, 100),
        ),
      }))
      .sort((a, b) => b.demandIntensity - a.demandIntensity);
  }

  private async buildMarketStats(filter: { city: string; district?: string }): Promise<MarketStatsResult> {
    const where = {
      status: ListingStatus.PUBLISHED,
      city: filter.city,
      district: filter.district,
    };

    const [listings, priceAgg, bookings, topAmenities, reviewsAgg] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        select: { id: true },
      }),
      this.prisma.listing.aggregate({
        where: { ...where, pricePerNight: { not: null } },
        _avg: { pricePerNight: true },
      }),
      this.prisma.booking.findMany({
        where: {
          listing: where,
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
          startDate: { gte: daysAgo(90) },
        },
        select: { listingId: true, startDate: true, endDate: true },
      }),
      this.getTopAmenities(where),
      this.prisma.listing.aggregate({
        where,
        _avg: { rating: true },
      }),
    ]);

    const listingCount = listings.length;
    const potentialNights = listingCount * 90;
    const bookedNights = bookings.reduce((acc, item) => acc + nightsBetween(item.startDate, item.endDate), 0);
    const averageOccupancy = potentialNights > 0 ? bookedNights / potentialNights : 0;

    const bookingDemand = bookingCountScore(bookings.length, listingCount);
    const reviewSignal = reviewsAgg._avg.rating ? Number(reviewsAgg._avg.rating) * 8 : 0;
    const demandIndex = round2(clamp(bookingDemand + reviewSignal + averageOccupancy * 35, 0, 100));

    return {
      averagePrice: round2(priceAgg._avg.pricePerNight ? Number(priceAgg._avg.pricePerNight) : 0),
      averageOccupancy: round2(clamp(averageOccupancy, 0, 1)),
      topAmenities,
      demandIndex,
    };
  }

  private async getTopAmenities(where: { city: string; district?: string; status: ListingStatus }) {
    const listings = await this.prisma.listing.findMany({
      where,
      select: { id: true },
    });
    if (listings.length === 0) {
      return [];
    }

    const grouped = await this.prisma.listingAmenity.groupBy({
      by: ['amenityId'],
      where: {
        listingId: { in: listings.map((item) => item.id) },
      },
      _count: { amenityId: true },
      orderBy: { _count: { amenityId: 'desc' } },
      take: 5,
    });

    const amenityIds = grouped.map((item) => item.amenityId);
    const amenities = await this.prisma.amenity.findMany({
      where: { id: { in: amenityIds } },
      select: { id: true, name: true },
    });
    const amenityMap = new Map(amenities.map((item) => [item.id, item.name]));

    return amenityIds.map((id) => amenityMap.get(id)).filter((name): name is string => typeof name === 'string');
  }
}

function nightsBetween(start: Date, end: Date): number {
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function daysAgo(days: number): Date {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() - days);
  return value;
}

function bookingCountScore(bookings: number, listings: number): number {
  if (listings === 0) {
    return 0;
  }
  return clamp((bookings / listings) * 5, 0, 45);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
