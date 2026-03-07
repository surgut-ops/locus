import type { ListingType } from '@prisma/client';

export type MarketPosition = 'UNDERPRICED' | 'MARKET_PRICE' | 'OVERPRICED';

export type OptimalPriceResult = {
  listingId: string;
  recommendedPrice: number;
  currentPrice: number | null;
  marketAveragePrice: number | null;
  demandScore: number;
  occupancyRate: number;
  confidenceScore: number;
};

export type MarketComparisonResult = {
  marketPosition: MarketPosition;
  averageCityPrice: number | null;
  averageDistrictPrice: number | null;
  similarListingsAveragePrice: number | null;
};

export type ValuationResult = {
  estimatedValue: number;
  confidenceScore: number;
  monthlyIncomePotential: number;
};

export type MarketStatsResult = {
  averagePrice: number;
  averageOccupancy: number;
  topAmenities: string[];
  demandIndex: number;
};

export type DemandForecastResult = {
  expectedBookings: number;
  peakSeasons: string[];
  lowDemandPeriods: string[];
  demandScore: number;
};

export type HostInsightsResult = {
  listingId: string;
  optimalPrice: OptimalPriceResult;
  marketComparison: MarketComparisonResult;
  valuation: ValuationResult;
  demandForecast: DemandForecastResult;
  occupancyPotential: number;
};

export type InvestmentAnalysisInput = {
  city: string;
  budget: number;
  propertyType?: ListingType;
};

export type InvestmentAreaInsight = {
  district: string;
  expectedROI: number;
  averageOccupancy: number;
  averagePrice: number;
};

export type InvestmentAnalysisResult = {
  city: string;
  budget: number;
  propertyType?: ListingType;
  bestInvestmentAreas: InvestmentAreaInsight[];
};

export type MarketHeatmapDistrict = {
  district: string;
  demandIntensity: number;
};

export class AIAdvancedError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AIAdvancedError';
    this.statusCode = statusCode;
  }
}
