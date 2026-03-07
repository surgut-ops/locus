import type { MarketRepository } from './market.repository.js';
import { MarketError, type MarketInsightResponse } from './market.types.js';

const DEMAND_SCORE_MAX = 100;

export class MarketService {
  public constructor(private readonly repository: MarketRepository) {}

  public async getListingMarketInsight(listingId: string): Promise<MarketInsightResponse> {
    const listing = await this.repository.getListingForMarket(listingId);
    if (!listing) {
      throw new MarketError('Listing not found', 404);
    }

    const listingPrice = Number(listing.pricePerNight ?? 0);
    const [averagePrice, bookingsCount, viewsCount, districtStats] = await Promise.all([
      this.repository.getCityAveragePrice(listing.city, listing.district),
      this.repository.getListingBookingsCount(listingId),
      this.repository.getListingViewsCount(listingId),
      this.repository.getDistrictDemandStats(listing.city, listing.district),
    ]);

    const priceDifference = listingPrice - averagePrice;
    const priceDifferencePercent =
      averagePrice > 0 ? (priceDifference / averagePrice) * 100 : 0;

    const demandScore = this.calculateDemandScore(
      bookingsCount,
      viewsCount,
      districtStats.maxBookings,
      districtStats.maxViews,
    );

    const marketScore = this.calculateMarketScore(districtStats);

    const aiInsight = await this.generateAIInsight({
      city: listing.city,
      district: listing.district,
      type: listing.type,
      listingPrice,
      averagePrice,
      priceDifferencePercent,
      demandScore,
      marketScore,
      bookingsCount,
      viewsCount,
    });

    return {
      averagePrice: Math.round(averagePrice * 100) / 100,
      listingPrice: Math.round(listingPrice * 100) / 100,
      priceDifference: Math.round(priceDifference * 100) / 100,
      priceDifferencePercent: Math.round(priceDifferencePercent * 10) / 10,
      demandScore: Math.round(demandScore),
      marketScore: Math.round(marketScore),
      aiInsight,
      city: listing.city,
      district: listing.district,
    };
  }

  private calculateDemandScore(
    bookings: number,
    views: number,
    maxBookings: number,
    maxViews: number,
  ): number {
    const normalizedBookings = maxBookings > 0 ? (bookings / maxBookings) * 50 : 0;
    const normalizedViews = maxViews > 0 ? Math.min(1, views / Math.max(100, maxViews)) * 50 : 0;
    return Math.min(DEMAND_SCORE_MAX, Math.round(normalizedBookings + normalizedViews));
  }

  private calculateMarketScore(stats: {
    avgBookings: number;
    avgViews: number;
    listingCount: number;
  }): number {
    if (stats.listingCount === 0) return 50;
    const demandFactor = Math.min(1, (stats.avgBookings * 2 + stats.avgViews / 50) / 10);
    return Math.min(DEMAND_SCORE_MAX, Math.round(30 + demandFactor * 70));
  }

  private async generateAIInsight(params: {
    city: string;
    district: string | null;
    type: string;
    listingPrice: number;
    averagePrice: number;
    priceDifferencePercent: number;
    demandScore: number;
    marketScore: number;
    bookingsCount: number;
    viewsCount: number;
  }): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return this.getFallbackInsight(params);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.5,
          max_tokens: 120,
          messages: [
            {
              role: 'system',
              content:
                'You are a real estate market analyst. Given listing market data, write a SHORT insight in 1-2 sentences (max 80 words). Write in the same language as the listing location. Be concise and actionable.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                city: params.city,
                district: params.district,
                type: params.type,
                listingPrice: params.listingPrice,
                marketAverage: params.averagePrice,
                priceVsMarket: `${params.priceDifferencePercent > 0 ? '+' : ''}${params.priceDifferencePercent}%`,
                demandScore: params.demandScore,
                marketScore: params.marketScore,
                bookings: params.bookingsCount,
                views: params.viewsCount,
              }),
            },
          ],
        }),
      });

      if (!response.ok) return this.getFallbackInsight(params);

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const content = json.choices?.[0]?.message?.content?.trim();
      if (content && content.length > 0 && content.length < 500) {
        return content;
      }
    } catch {
      // fallback
    }
    return this.getFallbackInsight(params);
  }

  private getFallbackInsight(params: {
    priceDifferencePercent: number;
    demandScore: number;
    city: string;
  }): string {
    const pricePart =
      params.priceDifferencePercent > 5
        ? `Цена выше рынка на ${params.priceDifferencePercent.toFixed(0)}%.`
        : params.priceDifferencePercent < -5
          ? `Цена ниже среднего на ${Math.abs(params.priceDifferencePercent).toFixed(0)}%.`
          : 'Цена соответствует рыночной.';
    const demandPart =
      params.demandScore >= 70 ? ' Высокий спрос.' : params.demandScore >= 40 ? ' Умеренный спрос.' : ' Низкий спрос.';
    return `${pricePart}${demandPart} Рынок ${params.city}.`;
  }
}
