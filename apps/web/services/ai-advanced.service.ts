import { apiRequest } from '../lib/api';

export type HostInsights = {
  listingId: string;
  optimalPrice: {
    recommendedPrice: number;
    currentPrice: number | null;
    marketAveragePrice: number | null;
    demandScore: number;
    occupancyRate: number;
    confidenceScore: number;
  };
  demandForecast: {
    expectedBookings: number;
    peakSeasons: string[];
    lowDemandPeriods: string[];
    demandScore: number;
  };
  marketComparison: {
    marketPosition: 'UNDERPRICED' | 'MARKET_PRICE' | 'OVERPRICED';
    averageCityPrice: number | null;
    averageDistrictPrice: number | null;
    similarListingsAveragePrice: number | null;
  };
  occupancyPotential: number;
};

export type InvestmentAnalysis = {
  city: string;
  budget: number;
  propertyType?: string;
  bestInvestmentAreas: Array<{
    district: string;
    expectedROI: number;
    averageOccupancy: number;
    averagePrice: number;
  }>;
};

export type HeatmapDistrict = {
  district: string;
  demandIntensity: number;
};

export async function fetchHostInsights(listingId: string) {
  return apiRequest<HostInsights>(`/ai/host-insights/${listingId}`, { cacheTtlMs: 10_000 });
}

export async function fetchInvestmentAnalysis(params: {
  city: string;
  budget: number;
  propertyType?: string;
}) {
  const query = new URLSearchParams({
    city: params.city,
    budget: String(params.budget),
  });
  if (params.propertyType) {
    query.set('propertyType', params.propertyType);
  }
  return apiRequest<InvestmentAnalysis>(`/ai/investment-analysis?${query.toString()}`, { cacheTtlMs: 10_000 });
}

export async function fetchMarketHeatmap(city?: string) {
  const query = city ? `?city=${encodeURIComponent(city)}` : '';
  return apiRequest<HeatmapDistrict[]>(`/ai/market-heatmap${query}`, { cacheTtlMs: 10_000 });
}
