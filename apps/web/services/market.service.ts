import { apiRequest } from '../lib/api';

export type MarketInsight = {
  averagePrice: number;
  listingPrice: number;
  priceDifference: number;
  priceDifferencePercent: number;
  demandScore: number;
  marketScore: number;
  aiInsight: string;
  city: string;
  district: string | null;
};

export async function fetchMarketInsight(listingId: string): Promise<MarketInsight> {
  return apiRequest<MarketInsight>(`/market/listing/${listingId}`, { cacheTtlMs: 5 * 60_000 });
}
