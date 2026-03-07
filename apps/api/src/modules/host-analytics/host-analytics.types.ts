import type { ListingStatus } from '@prisma/client';

export type MonthlyRevenue = {
  month: string;
  year: number;
  revenue: number;
};

export type MonthlyBookings = {
  month: string;
  year: number;
  count: number;
};

export type ListingPricePerformance = {
  listingId: string;
  title: string;
  listingPrice: number;
  marketAveragePrice: number;
  priceDifferencePercent: number;
  status: ListingStatus;
};

export type HostDashboardResponse = {
  totalRevenue: number;
  monthlyRevenue: MonthlyRevenue[];
  occupancyRate: number;
  bookingsPerMonth: MonthlyBookings[];
  listingCount: number;
  pricePerformance: ListingPricePerformance[];
  aiInsight: string;
};

export class HostAnalyticsError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'HostAnalyticsError';
    this.statusCode = statusCode;
  }
}
