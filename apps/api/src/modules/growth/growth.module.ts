import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance, FastifyReply } from 'fastify';

import { assertModeratorOrAdmin, AuthError, requireAuthenticatedUser } from '../../utils/auth.js';
import { AnalyticsService } from './analytics.service.js';
import { EmailService } from './email.service.js';
import { ReferralService } from './referral.service.js';
import { SEOService } from './seo.service.js';
import { TrendingSearchService } from './trending-search.service.js';
import { GrowthError, type GrowthEventType } from './growth.types.js';

type GrowthModuleOptions = {
  prisma: PrismaClient;
};

export async function registerGrowthModule(
  fastify: FastifyInstance,
  options: GrowthModuleOptions,
): Promise<void> {
  const trending = new TrendingSearchService();
  const analytics = new AnalyticsService(options.prisma, trending);
  const referrals = new ReferralService();
  const seo = new SEOService(options.prisma);
  const email = new EmailService();

  fastify.post('/analytics/event', async (request, reply) => {
    try {
      const body = toObject(request.body);
      const eventType = parseEventType(body.eventType);
      const metadata = isObject(body.metadata) ? body.metadata : {};

      let userId: string | null = null;
      if (typeof body.userId === 'string' && body.userId.trim()) {
        userId = body.userId.trim();
      } else {
        try {
          userId = requireAuthenticatedUser(request).id;
        } catch {
          userId = null;
        }
      }

      const result = await analytics.trackEvent({ eventType, userId, metadata });
      return reply.code(200).send(result);
    } catch (error) {
      return handleGrowthError(reply, error);
    }
  });

  fastify.get('/analytics/conversion-rates', async (_request, reply) => {
    try {
      const rates = await analytics.getConversionRates();
      return reply.code(200).send(rates);
    } catch (error) {
      return handleGrowthError(reply, error);
    }
  });

  fastify.get('/growth/trending-searches', async (request, reply) => {
    try {
      const query = toObject(request.query);
      const limit = parseOptionalPositiveInt(query.limit, 10);
      const result = await analytics.getTrendingSearches(limit);
      return reply.code(200).send(result);
    } catch (error) {
      return handleGrowthError(reply, error);
    }
  });

  fastify.get('/referral/link', async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      const result = await referrals.getReferralLink(actor.id);
      return reply.code(200).send(result);
    } catch (error) {
      return handleGrowthError(reply, error);
    }
  });

  fastify.post('/referral/redeem', async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      const body = toObject(request.body);
      const code = requireString(body.code, 'code');
      const result = await referrals.redeem(code, actor.id);

      await email.sendReferralInvite({
        userId: actor.id,
        referrerName: 'LOCUS User',
        referralLink: `code:${code}`,
      });
      return reply.code(200).send(result);
    } catch (error) {
      return handleGrowthError(reply, error);
    }
  });

  fastify.get('/sitemap.xml', async (request, reply) => {
    try {
      const host = request.headers.host ?? 'localhost:3001';
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const xml = await seo.generateSitemapXml(`${protocol}://${host}`);
      reply.header('Content-Type', 'application/xml');
      return reply.code(200).send(xml);
    } catch (error) {
      return handleGrowthError(reply, error);
    }
  });

  fastify.get('/seo/metadata/city/:city', async (request, reply) => {
    try {
      const params = request.params as Record<string, unknown>;
      const city = requireString(params.city, 'city');
      return reply.code(200).send(seo.generateCityMetadata(city));
    } catch (error) {
      return handleGrowthError(reply, error);
    }
  });

  fastify.get('/seo/metadata/city/:city/district/:district', async (request, reply) => {
    try {
      const params = request.params as Record<string, unknown>;
      const city = requireString(params.city, 'city');
      const district = requireString(params.district, 'district');
      return reply.code(200).send(seo.generateDistrictMetadata(city, district));
    } catch (error) {
      return handleGrowthError(reply, error);
    }
  });

  fastify.get('/seo/metadata/listings/:id', async (request, reply) => {
    try {
      const params = request.params as Record<string, unknown>;
      const listingId = requireString(params.id, 'id');
      const listing = await options.prisma.listing.findUnique({
        where: { id: listingId },
        select: {
          id: true,
          title: true,
          city: true,
          country: true,
          pricePerNight: true,
          currency: true,
          description: true,
        },
      });
      if (!listing) {
        throw new GrowthError('Listing not found', 404);
      }
      return reply.code(200).send(
        seo.generatePropertyMetadata({
          id: listing.id,
          title: listing.title,
          city: listing.city,
          country: listing.country,
          pricePerNight: listing.pricePerNight ? Number(listing.pricePerNight) : null,
          currency: listing.currency,
          description: listing.description,
        }),
      );
    } catch (error) {
      return handleGrowthError(reply, error);
    }
  });

  fastify.get('/admin/growth', async (request, reply) => {
    try {
      const actor = requireAuthenticatedUser(request);
      assertModeratorOrAdmin(actor);
      const [metrics, conversion] = await Promise.all([
        analytics.getGrowthMetrics(),
        analytics.getConversionRates(),
      ]);
      return reply.code(200).send({ ...metrics, funnel: conversion });
    } catch (error) {
      return handleGrowthError(reply, error);
    }
  });
}

function handleGrowthError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  if (error instanceof GrowthError) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
}

function toObject(value: unknown): Record<string, unknown> {
  if (!isObject(value)) {
    return {};
  }
  return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseEventType(value: unknown): GrowthEventType {
  const allowed: GrowthEventType[] = [
    'user_signup',
    'listing_created',
    'listing_view',
    'booking_created',
    'search_performed',
    'message_sent',
    'visit_homepage',
    'search_listings',
    'view_listing',
    'complete_payment',
  ];
  if (typeof value !== 'string' || !allowed.includes(value as GrowthEventType)) {
    throw new GrowthError('Invalid eventType', 400);
  }
  return value as GrowthEventType;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new GrowthError(`Field "${field}" is required`, 400);
  }
  return value.trim();
}

function parseOptionalPositiveInt(value: unknown, fallback: number): number {
  if (typeof value === 'undefined') {
    return fallback;
  }
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new GrowthError('Invalid limit', 400);
  }
  return num;
}
