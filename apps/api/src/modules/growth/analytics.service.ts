import { PaymentStatus, type PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';

import { GrowthError, type ConversionRates, type GrowthEvent, type GrowthEventType } from './growth.types.js';
import { TrendingSearchService } from './trending-search.service.js';

export class AnalyticsService {
  private readonly redis: Redis | null;
  private readonly fallbackEvents: GrowthEvent[] = [];

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly trendingSearch: TrendingSearchService,
  ) {
    const redisUrl = process.env.REDIS_URL ?? null;
    this.redis = redisUrl ? new Redis(redisUrl) : null;
  }

  public async trackEvent(input: {
    eventType: GrowthEventType;
    userId: string | null;
    metadata: Record<string, unknown>;
  }): Promise<{ success: true }> {
    const event: GrowthEvent = {
      id: randomUUID(),
      eventType: input.eventType,
      userId: input.userId,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    };

    await this.persistEvent(event);

    const query = extractSearchQuery(event);
    if (query) {
      await this.trendingSearch.trackQuery(query);
    }

    return { success: true };
  }

  public async getConversionRates(): Promise<ConversionRates> {
    const events = await this.getRecentEvents(60 * 60 * 24 * 30);
    const counts = {
      visit: events.filter((item) => item.eventType === 'visit_homepage').length,
      search: events.filter((item) => item.eventType === 'search_listings').length,
      view: events.filter((item) => item.eventType === 'view_listing').length,
      booking: events.filter((item) => item.eventType === 'booking_created').length,
      payment: events.filter((item) => item.eventType === 'complete_payment').length,
    };

    return {
      visitHomepageToSearch: ratio(counts.search, counts.visit),
      searchToViewListing: ratio(counts.view, counts.search),
      viewListingToBooking: ratio(counts.booking, counts.view),
      bookingToPayment: ratio(counts.payment, counts.booking),
      overallVisitToPayment: ratio(counts.payment, counts.visit),
    };
  }

  public async getGrowthMetrics(): Promise<{
    dailyUsers: number;
    newListings: number;
    conversionRate: number;
    revenueGrowth: number;
  }> {
    const [dailyUsers, newListings, conversion, thisWeekRevenue, lastWeekRevenue] = await Promise.all([
      this.prisma.user.count({
        where: {
          createdAt: { gte: daysAgo(1) },
        },
      }),
      this.prisma.listing.count({
        where: {
          createdAt: { gte: daysAgo(1) },
        },
      }),
      this.getConversionRates(),
      this.getRevenueForPeriod(0, 7),
      this.getRevenueForPeriod(7, 14),
    ]);

    const revenueGrowth =
      lastWeekRevenue > 0
        ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
        : thisWeekRevenue > 0
          ? 100
          : 0;

    return {
      dailyUsers,
      newListings,
      conversionRate: conversion.overallVisitToPayment,
      revenueGrowth: round2(revenueGrowth),
    };
  }

  public async getTrendingSearches(limit = 10) {
    return this.trendingSearch.getTrending(limit);
  }

  private async persistEvent(event: GrowthEvent): Promise<void> {
    if (this.redis) {
      const key = 'growth:events';
      await this.redis.lpush(key, JSON.stringify(event));
      await this.redis.ltrim(key, 0, 20000);
      await this.redis.expire(key, 60 * 60 * 24 * 60);
      return;
    }

    this.fallbackEvents.unshift(event);
    if (this.fallbackEvents.length > 20000) {
      this.fallbackEvents.splice(20000);
    }
  }

  private async getRecentEvents(windowSeconds: number): Promise<GrowthEvent[]> {
    const since = Date.now() - windowSeconds * 1000;
    if (this.redis) {
      const rows = await this.redis.lrange('growth:events', 0, 5000);
      return rows
        .map((raw) => safeParse(raw))
        .filter((item): item is GrowthEvent => item !== null && Date.parse(item.createdAt) >= since);
    }

    return this.fallbackEvents.filter((item) => Date.parse(item.createdAt) >= since);
  }

  private async getRevenueForPeriod(fromDaysAgo: number, toDaysAgo: number): Promise<number> {
    if (fromDaysAgo < toDaysAgo) {
      throw new GrowthError('Invalid revenue period', 500);
    }

    const from = daysAgo(fromDaysAgo);
    const to = daysAgo(toDaysAgo);
    const agg = await this.prisma.payment.aggregate({
      where: {
        status: PaymentStatus.SUCCEEDED,
        createdAt: {
          lte: from,
          gte: to,
        },
      },
      _sum: { amount: true },
    });
    return agg._sum.amount ? Number(agg._sum.amount) : 0;
  }
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return round2((numerator / denominator) * 100);
}

function extractSearchQuery(event: GrowthEvent): string | null {
  if (event.eventType !== 'search_performed' && event.eventType !== 'search_listings') {
    return null;
  }
  const value = event.metadata.query;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function safeParse(raw: string): GrowthEvent | null {
  try {
    return JSON.parse(raw) as GrowthEvent;
  } catch {
    return null;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function daysAgo(days: number): Date {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() - days);
  return value;
}
