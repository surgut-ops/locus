import { BookingStatus, ListingStatus, type PrismaClient } from '@prisma/client';

import { AIAdvancedError, type ValuationResult } from './ai-advanced.types.js';

type ValuationInput = {
  city: string;
  district: string | null;
  area: number | null;
  rooms: number | null;
  amenitiesCount: number;
  rating: number;
  pricePerNight: number | null;
};

export class ValuationAIService {
  public constructor(private readonly prisma: PrismaClient) {}

  public async estimatePropertyValue(input: ValuationInput): Promise<ValuationResult> {
    if (!input.city.trim()) {
      throw new AIAdvancedError('city is required for valuation', 400);
    }

    const [marketNightlyPrice, occupancyRate, districtMultiplier] = await Promise.all([
      this.getCityAverageNightlyPrice(input.city, input.district),
      this.getCityOccupancyRate(input.city),
      this.getDistrictPriceMultiplier(input.city, input.district),
    ]);

    const nightlyBase = input.pricePerNight ?? marketNightlyPrice;
    const areaFactor = input.area ? 1 + Math.min(0.35, Math.max(-0.1, (input.area - 60) / 300)) : 1;
    const roomsFactor = input.rooms ? 1 + Math.min(0.15, Math.max(-0.05, (input.rooms - 2) * 0.03)) : 1;
    const amenitiesFactor = 1 + Math.min(0.12, input.amenitiesCount * 0.01);
    const ratingFactor = 1 + Math.min(0.1, Math.max(-0.08, (input.rating - 4) * 0.04));

    const adjustedNightly =
      nightlyBase * areaFactor * roomsFactor * amenitiesFactor * ratingFactor * districtMultiplier;
    const monthlyIncomePotential = adjustedNightly * 30 * Math.max(0.25, occupancyRate);
    const annualIncome = monthlyIncomePotential * 12;

    // Approximate income-based property valuation (gross rent multiplier ~ 14 years)
    const estimatedValue = annualIncome * 14;
    const confidence =
      0.55 +
      (input.pricePerNight ? 0.1 : 0) +
      (input.area ? 0.08 : 0) +
      (input.rooms ? 0.07 : 0) +
      (occupancyRate > 0 ? 0.1 : 0) +
      (marketNightlyPrice > 0 ? 0.1 : 0);

    return {
      estimatedValue: round2(estimatedValue),
      confidenceScore: round2(Math.min(0.95, confidence)),
      monthlyIncomePotential: round2(monthlyIncomePotential),
    };
  }

  private async getCityAverageNightlyPrice(city: string, district: string | null): Promise<number> {
    const districtAgg = district
      ? await this.prisma.listing.aggregate({
          where: {
            status: ListingStatus.PUBLISHED,
            city,
            district,
            pricePerNight: { not: null },
          },
          _avg: { pricePerNight: true },
        })
      : null;
    if (districtAgg?._avg.pricePerNight) {
      return Number(districtAgg._avg.pricePerNight);
    }

    const cityAgg = await this.prisma.listing.aggregate({
      where: {
        status: ListingStatus.PUBLISHED,
        city,
        pricePerNight: { not: null },
      },
      _avg: { pricePerNight: true },
    });
    return cityAgg._avg.pricePerNight ? Number(cityAgg._avg.pricePerNight) : 100;
  }

  private async getCityOccupancyRate(city: string): Promise<number> {
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - 120);

    const cityListings = await this.prisma.listing.count({
      where: { status: ListingStatus.PUBLISHED, city },
    });
    if (cityListings === 0) {
      return 0.45;
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        listing: { city },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        startDate: { gte: from },
      },
      select: { startDate: true, endDate: true },
    });
    const nights = bookings.reduce((acc, booking) => acc + nightsBetween(booking.startDate, booking.endDate), 0);
    const potential = cityListings * 120;
    return clamp(potential > 0 ? nights / potential : 0, 0.2, 0.95);
  }

  private async getDistrictPriceMultiplier(city: string, district: string | null): Promise<number> {
    if (!district) {
      return 1;
    }

    const [districtAgg, cityAgg] = await Promise.all([
      this.prisma.listing.aggregate({
        where: {
          status: ListingStatus.PUBLISHED,
          city,
          district,
          pricePerNight: { not: null },
        },
        _avg: { pricePerNight: true },
      }),
      this.prisma.listing.aggregate({
        where: {
          status: ListingStatus.PUBLISHED,
          city,
          pricePerNight: { not: null },
        },
        _avg: { pricePerNight: true },
      }),
    ]);

    const districtPrice = districtAgg._avg.pricePerNight ? Number(districtAgg._avg.pricePerNight) : null;
    const cityPrice = cityAgg._avg.pricePerNight ? Number(cityAgg._avg.pricePerNight) : null;
    if (!districtPrice || !cityPrice || cityPrice <= 0) {
      return 1;
    }

    return clamp(districtPrice / cityPrice, 0.85, 1.3);
  }
}

function nightsBetween(start: Date, end: Date): number {
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
