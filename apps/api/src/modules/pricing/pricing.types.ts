export type PricingSuggestResponse = {
  currentPrice: number | null;
  averageMarketPrice: number;
  recommendedPrice: number;
};

export class PricingError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'PricingError';
    this.statusCode = statusCode;
  }
}
