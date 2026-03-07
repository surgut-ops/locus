export type MarketInsightResponse = {
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

export class MarketError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'MarketError';
    this.statusCode = statusCode;
  }
}
