import { BookingStatus, ListingStatus, type ListingType, type PrismaClient } from '@prisma/client';

import { AIBehaviorService } from '../ai/ai.behavior.service.js';
import {
  AIAdvancedError,
  type MarketComparisonResult,
  type MarketPosition,
  type OptimalPriceResult,
} from './ai-advanced.types.js';

type ComparableListing = {
  city: string;
  district: string | null;
  type: ListingType;
  pricePerNight: number | null;
};

export class PricingAIService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly behavior: AIBehaviorService,
  ) {}

  public async calculateOptimalPrice(listingId: string): Promise<OptimalPriceResult> {
    if (!listingId.trim()) {
      throw new AIAdvancedError('listingId is required', 400);
    }

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        city: true,
        district: true,
        type: true,
        area: true,
        rating: true,
        pricePerNight: true,
        createdAt: true,
      },
    });
    if (!listing) {
      throw new AIAdvancedError('Listing not found', 404);
    }

    const baselinePrice = listing.pricePerNight ? Number(listing.pricePerNight) : null;
    const market = await this.buildMarketAverages({
      city: listing.city,
      district: listing.district,
      type: listing.type,
      pricePerNight: listing.pricePerNight ? Number(listing.pricePerNight) : null,
    });
    const occupancyRate = await this.getOccupancyRate(listing.id);
    const demandScore = await this.getDemandScore(listing.id, listing.city);

    const marketBase =
      market.similarListingsAveragePrice ?? market.averageDistrictPrice ?? market.averageCityPrice ?? baselinePrice;
    if (!marketBase) {
      throw new AIAdvancedError('Cannot determine market baseline for listing', 400);
    }

    const ratingBoost = 1 + clamp((listing.rating - 4) * 0.04, -0.08, 0.12);
    const demandBoost = 1 + clamp((demandScore - 50) / 500, -0.1, 0.15);
    const occupancyBoost = 1 + clamp((occupancyRate - 0.55) * 0.35, -0.08, 0.12);
    const sizeBoost = listing.area ? 1 + clamp((Number(listing.area) - 50) / 1000, -0.05, 0.08) : 1;

    const recommendedPrice = round2(marketBase * ratingBoost * demandBoost * occupancyBoost * sizeBoost);
    const confidence =
      0.55 +
      (market.similarListingsAveragePrice ? 0.15 : 0) +
      (occupancyRate > 0 ? 0.15 : 0) +
      (demandScore > 0 ? 0.15 : 0);

    return {
      listingId: listing.id,
      recommendedPrice,
      currentPrice: baselinePrice,
      marketAveragePrice: marketBase,
      demandScore,
      occupancyRate: round2(occupancyRate),
      confidenceScore: round2(Math.min(0.98, confidence)),
    };
  }

  public async compareMarketPrices(listing: ComparableListing): Promise<MarketComparisonResult> {
    const market = await this.buildMarketAverages(listing);
    const currentPrice = listing.pricePerNight;

    if (!currentPrice) {
      return {
        marketPosition: 'MARKET_PRICE',
        averageCityPrice: market.averageCityPrice,
        averageDistrictPrice: market.averageDistrictPrice,
        similarListingsAveragePrice: market.similarListingsAveragePrice,
      };
    }

    const benchmark =
      market.similarListingsAveragePrice ?? market.averageDistrictPrice ?? market.averageCityPrice ?? currentPrice;
    const diffRatio = benchmark > 0 ? (currentPrice - benchmark) / benchmark : 0;

    let marketPosition: MarketPosition = 'MARKET_PRICE';
    if (diffRatio <= -0.1) {
      marketPosition = 'UNDERPRICED';
    } else if (diffRatio >= 0.1) {
      marketPosition = 'OVERPRICED';
    }

    return {
      marketPosition,
      averageCityPrice: market.averageCityPrice,
      averageDistrictPrice: market.averageDistrictPrice,
      similarListingsAveragePrice: market.similarListingsAveragePrice,
    };
  }

  private async buildMarketAverages(listing: ComparableListing): Promise<{
    averageCityPrice: number | null;
    averageDistrictPrice: number | null;
    similarListingsAveragePrice: number | null;
  }> {
    const [cityAgg, districtAgg, similarAgg] = await Promise.all([
      this.prisma.listing.aggregate({
        where: {
          status: ListingStatus.PUBLISHED,
          city: listing.city,
          pricePerNight: { not: null },
        },
        _avg: { pricePerNight: true },
      }),
      listing.district
        ? this.prisma.listing.aggregate({
            where: {
              status: ListingStatus.PUBLISHED,
              city: listing.city,
              district: listing.district,
              pricePerNight: { not: null },
            },
            _avg: { pricePerNight: true },
          })
        : Promise.resolve(null),
      this.prisma.listing.aggregate({
        where: {
          status: ListingStatus.PUBLISHED,
          city: listing.city,
          type: listing.type,
          district: listing.district ?? undefined,
          pricePerNight: { not: null },
        },
        _avg: { pricePerNight: true },
      }),
    ]);

    return {
      averageCityPrice: cityAgg._avg.pricePerNight ? Number(cityAgg._avg.pricePerNight) : null,
      averageDistrictPrice: districtAgg?._avg.pricePerNight ? Number(districtAgg._avg.pricePerNight) : null,
      similarListingsAveragePrice: similarAgg._avg.pricePerNight ? Number(similarAgg._avg.pricePerNight) : null,
    };
  }

  private async getOccupancyRate(listingId: string): Promise<number> {
    const now = new Date();
    const from = new Date(now);
    from.setUTCDate(from.getUTCDate() - 90);

    const bookings = await this.prisma.booking.findMany({
      where: {
        listingId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        startDate: { gte: from },
      },
      select: { startDate: true, endDate: true },
    });

    const bookedNights = bookings.reduce((acc, booking) => {
      const nights = Math.max(
        1,
        Math.floor((booking.endDate.getTime() - booking.startDate.getTime()) / (1000 * 60 * 60 * 24)),
      );
      return acc + nights;
    }, 0);

    return clamp(bookedNights / 90, 0, 1);
  }

  private async getDemandScore(listingId: string, city: string): Promise<number> {
    const [viewCount, cityBookings] = await Promise.all([
      this.behavior.getListingViewsCount(listingId),
      this.prisma.booking.count({
        where: {
          listing: { city },
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
          createdAt: {
            gte: daysAgo(60),
          },
        },
      }),
    ]);

    const viewScore = Math.min(60, viewCount / 3);
    const bookingScore = Math.min(40, cityBookings / 2);
    return round2(clamp(viewScore + bookingScore, 1, 100));
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function daysAgo(days: number): Date {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() - days);
  return value;
}
