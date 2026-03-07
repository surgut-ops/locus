import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../../utils/auth.js';
import { HostAnalyticsRepository } from './host-analytics.repository.js';
import type {
  HostDashboardResponse,
  ListingPricePerformance,
  MonthlyBookings,
  MonthlyRevenue,
} from './host-analytics.types.js';
import { HostAnalyticsError } from './host-analytics.types.js';

const DAYS_FOR_OCCUPANCY = 90;

export class HostAnalyticsService {
  public constructor(private readonly repository: HostAnalyticsRepository) {}

  public async getDashboard(actor: AuthenticatedUser): Promise<HostDashboardResponse> {
    const canAccess =
      actor.role === UserRole.HOST ||
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.MODERATOR;

    if (!canAccess) {
      throw new HostAnalyticsError('Host access required', 403);
    }

    const hostId = actor.id;

    const [
      totalRevenue,
      monthlyRevenue,
      monthlyBookings,
      bookedNights,
      availableNights,
      listingsWithPrices,
    ] = await Promise.all([
      this.repository.getTotalRevenue(hostId),
      this.repository.getMonthlyRevenue(hostId),
      this.repository.getMonthlyBookings(hostId),
      this.repository.getBookedNights(hostId, DAYS_FOR_OCCUPANCY),
      this.repository.getAvailableNights(hostId, DAYS_FOR_OCCUPANCY),
      this.repository.getListingsWithPrices(hostId),
    ]);

    const occupancyRate =
      availableNights > 0
        ? Math.round((bookedNights / availableNights) * 10000) / 100
        : 0;

    const pricePerformance: ListingPricePerformance[] = [];
    for (const listing of listingsWithPrices) {
      const marketAvg = await this.repository.getCityAveragePrice(
        listing.city,
        listing.district,
      );
      const diffPercent =
        marketAvg > 0
          ? ((listing.pricePerNight - marketAvg) / marketAvg) * 100
          : 0;

      pricePerformance.push({
        listingId: listing.id,
        title: listing.title,
        listingPrice: Math.round(listing.pricePerNight * 100) / 100,
        marketAveragePrice: Math.round(marketAvg * 100) / 100,
        priceDifferencePercent: Math.round(diffPercent * 10) / 10,
        status: listing.status,
      });
    }

    const aiInsight = await this.generateAIInsight({
      totalRevenue,
      occupancyRate,
      monthlyRevenue,
      monthlyBookings,
      listingCount: listingsWithPrices.length,
      pricePerformance,
    });

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      monthlyRevenue: monthlyRevenue as MonthlyRevenue[],
      occupancyRate,
      bookingsPerMonth: monthlyBookings as MonthlyBookings[],
      listingCount: listingsWithPrices.length,
      pricePerformance,
      aiInsight,
    };
  }

  private async generateAIInsight(params: {
    totalRevenue: number;
    occupancyRate: number;
    monthlyRevenue: MonthlyRevenue[];
    monthlyBookings: MonthlyBookings[];
    listingCount: number;
    pricePerformance: ListingPricePerformance[];
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
          max_tokens: 200,
          messages: [
            {
              role: 'system',
              content:
                'You are a real estate host advisor. Given analytics, give 2-3 SHORT actionable recommendations. Be concise. Write in Russian or English based on context. Max 150 words.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                totalRevenue: params.totalRevenue,
                occupancyRate: params.occupancyRate,
                listingCount: params.listingCount,
                recentRevenue: params.monthlyRevenue.slice(-3),
                recentBookings: params.monthlyBookings.slice(-3),
                priceVsMarket: params.pricePerformance.slice(0, 3).map((p) => ({
                  title: p.title,
                  diff: p.priceDifferencePercent,
                })),
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
      if (content && content.length < 500) {
        return content;
      }
    } catch {
      // fallback
    }
    return this.getFallbackInsight(params);
  }

  private getFallbackInsight(params: {
    totalRevenue: number;
    occupancyRate: number;
    listingCount: number;
  }): string {
    const parts: string[] = [];
    if (params.occupancyRate < 30 && params.listingCount > 0) {
      parts.push('Рекомендуем снизить цены или улучшить фото — загрузка низкая.');
    }
    if (params.occupancyRate > 70) {
      parts.push('Высокая загрузка. Рассмотрите повышение цен.');
    }
    if (params.totalRevenue === 0 && params.listingCount > 0) {
      parts.push('Пока нет дохода. Добавьте качественные фото и описание.');
    }
    return parts.length > 0 ? parts.join(' ') : 'Данных пока мало. Добавьте объявления и получите первые бронирования.';
  }
}
