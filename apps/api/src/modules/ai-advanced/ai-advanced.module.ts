import { ListingStatus, UserRole, ListingType, type PrismaClient } from '@prisma/client';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type Redis from 'ioredis';

import { getSharedRedis } from '../../lib/redis.client.js';
import { AuthError, requireAuthenticatedUser } from '../../utils/auth.js';
import { AIBehaviorService } from '../ai/ai.behavior.service.js';
import { AIAdvancedError, type InvestmentAnalysisResult } from './ai-advanced.types.js';
import { ForecastAIService } from './forecast-ai.service.js';
import { MarketAIService } from './market-ai.service.js';
import { PricingAIService } from './pricing-ai.service.js';
import { ValuationAIService } from './valuation-ai.service.js';

type AIAdvancedModuleOptions = {
  prisma: PrismaClient;
};

const CACHE_TTL_SECONDS = 600;

export async function registerAIAdvancedModule(
  fastify: FastifyInstance,
  options: AIAdvancedModuleOptions,
): Promise<void> {
  const behavior = new AIBehaviorService();
  const pricing = new PricingAIService(options.prisma, behavior);
  const valuation = new ValuationAIService(options.prisma);
  const market = new MarketAIService(options.prisma, behavior);
  const forecast = new ForecastAIService(options.prisma, behavior);

  const redis = getSharedRedis();

  fastify.get('/ai/host-insights/:listingId', async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      const listingId = requireString((request.params as Record<string, unknown>).listingId, 'listingId');

      const listing = await options.prisma.listing.findUnique({
        where: { id: listingId },
        select: {
          id: true,
          ownerId: true,
          city: true,
          district: true,
          type: true,
          area: true,
          rooms: true,
          rating: true,
          pricePerNight: true,
          amenities: {
            select: { amenityId: true },
          },
        },
      });
      if (!listing) {
        throw new AIAdvancedError('Listing not found', 404);
      }

      const canAccess =
        actor.id === listing.ownerId ||
        actor.role === UserRole.ADMIN ||
        actor.role === UserRole.MODERATOR;
      if (!canAccess) {
        throw new AIAdvancedError('Only listing host can access insights', 403);
      }

      const cacheKey = `ai-advanced:host-insights:${listing.id}`;
      const cached = await getCache(redis, cacheKey);
      if (cached) {
        return reply.code(200).send(cached);
      }

      const [optimalPrice, marketComparison, valuationResult, demandForecast] = await Promise.all([
        pricing.calculateOptimalPrice(listing.id),
        pricing.compareMarketPrices({
          city: listing.city,
          district: listing.district,
          type: listing.type,
          pricePerNight: listing.pricePerNight ? Number(listing.pricePerNight) : null,
        }),
        valuation.estimatePropertyValue({
          city: listing.city,
          district: listing.district,
          area: listing.area ? Number(listing.area) : null,
          rooms: listing.rooms,
          amenitiesCount: listing.amenities.length,
          rating: listing.rating,
          pricePerNight: listing.pricePerNight ? Number(listing.pricePerNight) : null,
        }),
        forecast.predictDemand(listing.id),
      ]);

      const response = {
        listingId: listing.id,
        optimalPrice,
        demandForecast,
        marketComparison,
        valuation: valuationResult,
        occupancyPotential: round2(Math.min(1, demandForecast.demandScore / 100 + 0.25)),
      };

      await setCache(redis, cacheKey, response, CACHE_TTL_SECONDS);
      return reply.code(200).send(response);
    } catch (error) {
      return handleError(reply, error);
    }
  });

  fastify.get('/ai/investment-analysis', async (request, reply) => {
    try {
      const query = (request.query ?? {}) as Record<string, unknown>;
      const city = requireString(query.city, 'city');
      const budget = requireNumber(query.budget, 'budget');
      const propertyType = parseListingType(query.propertyType);

      const cacheKey = `ai-advanced:investment:${city}:${budget}:${propertyType ?? 'ANY'}`;
      const cached = await getCache(redis, cacheKey);
      if (cached) {
        return reply.code(200).send(cached);
      }

      const districtsRaw = await options.prisma.listing.findMany({
        where: {
          status: ListingStatus.PUBLISHED,
          city,
          type: propertyType ?? undefined,
          district: { not: null },
          pricePerNight: { not: null },
        },
        select: { district: true },
        distinct: ['district'],
      });
      const districts = districtsRaw
        .map((item) => item.district)
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);

      const areas: InvestmentAnalysisResult['bestInvestmentAreas'] = [];
      for (const district of districts) {
        const [stats, districtPrice] = await Promise.all([
          market.getDistrictStats(city, district),
          options.prisma.listing.aggregate({
            where: {
              status: ListingStatus.PUBLISHED,
              city,
              district,
              type: propertyType ?? undefined,
              pricePerNight: { not: null },
            },
            _avg: { pricePerNight: true },
          }),
        ]);

        const averagePrice = districtPrice._avg.pricePerNight ? Number(districtPrice._avg.pricePerNight) : 0;
        if (averagePrice <= 0) {
          continue;
        }

        const annualRevenue = averagePrice * stats.averageOccupancy * 365 * 0.9;
        const expectedROI = round2((annualRevenue / budget) * 100);

        areas.push({
          district,
          expectedROI,
          averageOccupancy: stats.averageOccupancy,
          averagePrice: round2(averagePrice),
        });
      }

      const result: InvestmentAnalysisResult = {
        city,
        budget,
        propertyType: propertyType ?? undefined,
        bestInvestmentAreas: areas.sort((a, b) => b.expectedROI - a.expectedROI).slice(0, 8),
      };

      await setCache(redis, cacheKey, result, CACHE_TTL_SECONDS);
      return reply.code(200).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  });

  fastify.get('/ai/market-heatmap', async (request, reply) => {
    try {
      const query = (request.query ?? {}) as Record<string, unknown>;
      const city = typeof query.city === 'string' ? query.city : undefined;
      const cacheKey = `ai-advanced:market-heatmap:${city ?? 'ALL'}`;
      const cached = await getCache(redis, cacheKey);
      if (cached) {
        return reply.code(200).send(cached);
      }

      const heatmap = await market.getMarketHeatmap(city);
      await setCache(redis, cacheKey, heatmap, CACHE_TTL_SECONDS);
      return reply.code(200).send(heatmap);
    } catch (error) {
      return handleError(reply, error);
    }
  });
}

function handleError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof AIAdvancedError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}

async function getCache(redis: Redis | null, key: string): Promise<unknown | null> {
  if (!redis) {
    return null;
  }
  const raw = await redis.get(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function setCache(redis: Redis | null, key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!redis) {
    return;
  }
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AIAdvancedError(`Field "${field}" is required`, 400);
  }
  return value.trim();
}

function requireNumber(value: unknown, field: string): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AIAdvancedError(`Field "${field}" must be a positive number`, 400);
  }
  return parsed;
}

function parseListingType(value: unknown): ListingType | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  if (!Object.values(ListingType).includes(value as ListingType)) {
    throw new AIAdvancedError('Invalid propertyType', 400);
  }
  return value as ListingType;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
